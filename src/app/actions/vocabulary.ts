'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';
import { translateWord } from './translate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getDistractors(en: string) {
  try {
    // Fetch related words from Datamuse API (means-like or same-topic)
    const res = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(en)}&max=10`);
    const data = await res.json();
    
    const words = data
      .map((item: any) => item.word.toLowerCase())
      .filter((word: string) => word !== en.toLowerCase() && !word.includes(' '));
    
    // Translate them to CZ
    const translatedDistractors = await Promise.all(
      words.slice(0, 6).map(async (word: string) => {
        const cz = await translateWord(word);
        return { en: word, cz };
      })
    );

    return translatedDistractors.filter(d => d.cz);
  } catch (err) {
    console.error('Distractor generation error:', err);
    return [];
  }
}

export async function addVocabularyWord(en: string, cz: string) {
  if (!en || !cz) return { error: 'Chybí slovíčka' };
  if (!supabaseServiceKey) return { error: 'Chybí klíč SUPABASE_SERVICE_ROLE_KEY' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const enNormalized = en.trim().toLowerCase();

    // 1. Check for duplicates
    const { data: existing } = await supabase
      .from('vocabulary')
      .select('id')
      .eq('en', enNormalized)
      .maybeSingle();

    if (existing) {
      return { error: `Slovíčko "${enNormalized}" už v databázi existuje!` };
    }

    // 2. Generate distractors (related words)
    const distractors = await getDistractors(enNormalized);

    // 3. Generate Audio
    const fileName = `${Date.now()}-${enNormalized.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-AvaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const { audioStream } = tts.toStream(enNormalized);
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => resolve(Buffer.concat(chunks)));
      audioStream.on("error", reject);
    });

    if (!audioBuffer || audioBuffer.length === 0) throw new Error('Audio se nepodařilo vygenerovat');

    // 4. Upload Audio
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg' });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName);

    // 5. Save to Database with distractors
    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{ 
        en: enNormalized, 
        cz: cz.trim().toLowerCase(), 
        audio_url: publicUrl,
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
