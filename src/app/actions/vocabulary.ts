'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';
import { translateWord } from './translate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BASIC_POOL = [
  'cat', 'dog', 'apple', 'ball', 'red', 'blue', 'green', 'one', 'two', 'three', 
  'home', 'tree', 'sun', 'book', 'car', 'milk', 'water', 'fish', 'bird', 'pen',
  'box', 'star', 'cake', 'egg', 'hat', 'frog', 'jump', 'run', 'smile', 'love'
];

async function fetchFromDatamuse(query: string) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?${query}&max=20`);
    const data = await res.json();
    return data.map((item: any) => item.word.toLowerCase());
  } catch (e) {
    console.error('Datamuse error:', e);
    return [];
  }
}

async function getEnhancedDistractors(en: string) {
  const enLower = en.toLowerCase();
  
  // 1. SEMANTIC (Meaning related)
  const semanticCandidates = await fetchFromDatamuse(`ml=${encodeURIComponent(enLower)}`);
  const filteredSemantic = semanticCandidates
    .filter((w: string) => w !== enLower && !w.includes(' ') && !w.includes('-') && w.length > 1)
    .slice(0, 10);

  const semantic = await Promise.all(
    filteredSemantic.map(async (word: string) => {
      const cz = await translateWord(word);
      return { en: word, cz };
    })
  );

  // 2. VISUAL / PHONETIC (Sound or spelling related)
  // sl = sounds like, sp = spelled like (with wildcards)
  const [soundsLike, spelledLike] = await Promise.all([
    fetchFromDatamuse(`sl=${encodeURIComponent(enLower)}`),
    fetchFromDatamuse(`sp=${encodeURIComponent(enLower)}?*`) // Words with extra chars
  ]);

  const visual = [...new Set([...soundsLike, ...spelledLike])]
    .filter((w: string) => w !== enLower && !w.includes(' ') && w.length > 1)
    .slice(0, 15);

  return {
    semantic: semantic.filter(d => d.cz && d.cz.toLowerCase() !== d.en.toLowerCase()),
    visual
  };
}

export async function addVocabularyWord(en: string, cz: string) {
  if (!en || !cz) return { error: 'Chybí slovíčka' };
  if (!supabaseServiceKey) return { error: 'Chybí klíč SUPABASE_SERVICE_ROLE_KEY' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const enNormalized = en.trim().toLowerCase();

    const { data: existing } = await supabase
      .from('vocabulary')
      .select('id')
      .eq('en', enNormalized)
      .maybeSingle();

    if (existing) return { error: `Slovíčko "${enNormalized}" už v databázi existuje!` };

    const distractors = await getEnhancedDistractors(enNormalized);
    const audioUrl = await generateAndUploadAudio(enNormalized, supabase);

    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{ 
        en: enNormalized, 
        cz: cz.trim().toLowerCase(), 
        audio_url: audioUrl,
        distractors: distractors,
        created_at: new Date().toISOString()
      }])
      .select();

    if (dbError) throw dbError;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in addVocabularyWord:', err);
    return { error: err.message || 'Nepodařilo se přidat slovíčko' };
  }
}

async function generateAndUploadAudio(en: string, supabase: any) {
  const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_')}.mp3`;
  const tts: any = new MsEdgeTTS();
  await tts.setMetadata("en-US-AvaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  
  const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
    const { audioStream } = tts.toStream(en);
    const chunks: Buffer[] = [];
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", reject);
  });

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(fileName, audioBuffer, { contentType: 'audio/mpeg' });

  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName);
  return publicUrl;
}

// ADMIN FUNCTION: Regenerate missing data for all words
export async function adminRegenerateAll() {
  if (!supabaseServiceKey) return { error: 'Unauthorized' };
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: words, error: fetchError } = await supabase.from('vocabulary').select('*');
    if (fetchError) throw fetchError;

    let updatedCount = 0;
    for (const word of (words || [])) {
      const needsAudio = !word.audio_url;
      const needsDistractors = !word.distractors || !word.distractors.semantic;

      if (needsAudio || needsDistractors) {
        const updateData: any = {};
        
        if (needsDistractors) {
          updateData.distractors = await getEnhancedDistractors(word.en);
        }
        
        if (needsAudio) {
          updateData.audio_url = await generateAndUploadAudio(word.en, supabase);
        }

        await supabase.from('vocabulary').update(updateData).eq('id', word.id);
        updatedCount++;
      }
    }

    return { success: true, count: updatedCount };
  } catch (err: any) {
    console.error('Admin regenerate error:', err);
    return { error: err.message };
  }
}
