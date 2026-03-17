'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Logic to generate similar-looking/sounding words
function generateVisualDistractors(word: string): string[] {
  const misspellings = new Set<string>();
  const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
  const baseWord = word.trim().toLowerCase();

  // 1. Double letters or remove double letters
  for (let i = 0; i < baseWord.length - 1; i++) {
    if (baseWord[i] === baseWord[i + 1]) {
      misspellings.add(baseWord.slice(0, i) + baseWord.slice(i + 1)); // remove one
    } else {
      misspellings.add(baseWord.slice(0, i + 1) + baseWord[i] + baseWord.slice(i + 1)); // double it
    }
  }

  // 2. Replace vowels with other vowels
  for (let i = 0; i < baseWord.length; i++) {
    if (vowels.includes(baseWord[i])) {
      vowels.filter(v => v !== baseWord[i]).forEach(v => {
        misspellings.add(baseWord.slice(0, i) + v + baseWord.slice(i + 1));
      });
    }
  }

  // 3. Swap adjacent letters
  for (let i = 0; i < baseWord.length - 1; i++) {
    misspellings.add(baseWord.slice(0, i) + baseWord[i + 1] + baseWord[i] + baseWord.slice(i + 2));
  }

  // 4. Common phonetic substitutions
  const phoneticMap: Record<string, string[]> = {
    'ph': ['f'], 'f': ['ph', 'v'], 'c': ['k', 's'], 'k': ['c'], 's': ['c', 'z'], 'z': ['s'],
    'ea': ['ee', 'e'], 'ee': ['ea', 'i'], 'ou': ['ow', 'o'], 'ow': ['ou'], 'th': ['d', 't', 'f'],
    'ch': ['sh', 'tch'], 'sh': ['ch'], 'w': ['v'], 'v': ['w'], 'i': ['y'], 'y': ['i', 'j']
  };

  for (const [key, values] of Object.entries(phoneticMap)) {
    if (baseWord.includes(key)) {
      values.forEach(val => {
        misspellings.add(baseWord.replace(key, val));
      });
    }
  }

  // 5. Remove one letter (for words > 2 letters)
  if (baseWord.length > 2) {
    for (let i = 0; i < baseWord.length; i++) {
      misspellings.add(baseWord.slice(0, i) + baseWord.slice(i + 1));
    }
  }

  return Array.from(misspellings)
    .filter(v => v !== baseWord && v.length > (baseWord.length > 2 ? 1 : 0))
    .sort(() => 0.5 - Math.random())
    .slice(0, 15);
}

async function getEnhancedDistractors(en: string) {
  const enLower = en.toLowerCase().trim();

  // Try to get real similar words from Datamuse (sounds like)
  let soundsLike: string[] = [];
  try {
    const res = await fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(enLower)}&max=10`);
    const data = await res.json();
    soundsLike = data.map((item: { word: string }) => item.word.toLowerCase());
  } catch { }

  // Mix real words with generated variations
  const visual = [...new Set([...generateVisualDistractors(enLower), ...soundsLike])]
    .filter((w: string) => /^[a-z\s]+$/i.test(w) && w !== enLower && w.length > 1)
    .slice(0, 20);

  return visual;
}

export async function addVocabularyWord(en: string) {
  if (!en) return { error: 'Chybí slovíčko' };
  if (!supabaseServiceKey) return { error: 'Chybí klíč SUPABASE_SERVICE_ROLE_KEY' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const enNormalized = en.trim().toLowerCase();

    const { data: existing } = await supabase
      .from('vocabulary')
      .select('id')
      .eq('en', enNormalized)
      .maybeSingle();

    if (existing) return { error: `Slovíčko "${enNormalized}" už existuje!` };

    const distractors = await getEnhancedDistractors(enNormalized);
    const audioUrl = await generateAndUploadAudio(enNormalized, supabase);

    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{
        en: enNormalized,
        audio_url: audioUrl,
        distractors: distractors,
        created_at: new Date().toISOString()
      }])
      .select();

    if (dbError) throw dbError;
    return { success: true, data };
  } catch (err: unknown) {
    console.error('Error in addVocabularyWord:', err);
    return { error: (err as Error).message || 'Nepodařilo se přidat slovíčko' };
  }
}

import { SupabaseClient } from '@supabase/supabase-js';

async function generateAndUploadAudio(en: string, supabase: SupabaseClient) {
  const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_')}.mp3`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function adminRegenerateAll() {
  if (!supabaseServiceKey) return { error: 'Unauthorized' };
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: words, error: fetchError } = await supabase.from('vocabulary').select('*');
    if (fetchError) throw fetchError;

    let updatedCount = 0;
    for (const word of (words || [])) {
      const distractors = await getEnhancedDistractors(word.en);
      const audioUrl = word.audio_url || await generateAndUploadAudio(word.en, supabase);

      await supabase.from('vocabulary').update({
        distractors,
        audio_url: audioUrl
      }).eq('id', word.id);
      updatedCount++;
    }

    return { success: true, count: updatedCount };
  } catch (err: unknown) {
    console.error('Admin regenerate error:', err);
    return { error: (err as Error).message };
  }
}
