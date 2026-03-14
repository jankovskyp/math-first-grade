'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // CRITICAL: Need Service Role Key for uploads

export async function addVocabularyWord(en: string, cz: string) {
  if (!en || !cz) return { error: 'Missing words' };
  if (!supabaseServiceKey) return { error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment variables' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;

    // 1. Generate Audio using Edge TTS with Promise wrapper
    // Cast to any to bypass library type definition issues on Vercel build
    const tts: any = new MsEdgeTTS();
    await tts.setMetadata("en-US-AvaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      tts.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      tts.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      tts.on("error", (err: any) => {
        reject(err);
      });

      // Start the generation
      tts.push(en);
    });

    // 2. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);

    // 4. Save to Database
    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{ 
        en: en.toLowerCase(), 
        cz: cz.toLowerCase(), 
        audio_url: publicUrl,
        created_at: new Date().toISOString()
      }])
      .select();

    if (dbError) throw dbError;

    return { success: true, data };
  } catch (err: any) {
    console.error('Error in addVocabularyWord:', err);
    return { error: err.message || 'Failed to process word' };
  }
}
