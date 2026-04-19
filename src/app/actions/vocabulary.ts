'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

// ── Universal image generation prompt ────────────────────────────────────────

const IMAGE_PROMPT = (word: string) => `Create a simple educational flashcard illustration for the English word: "${word}"

Style: flat vector illustration, white background, bright friendly colors, clean outlines, no text or labels in the image, suitable for children aged 6–10.

Guidelines by word type:
- Nouns & animals: draw the object or animal clearly, full body, centered, recognisable at a glance
- Prepositions of place (in, on, under, behind, between, next to, in front of…): show a small colorful ball and a simple wooden box demonstrating that exact spatial relationship
- Adjectives of size (big, small, tall, short, long…): two similar objects side by side showing the contrast clearly
- Adjectives of feeling or state (happy, sad, angry, tired, scared…): a simple round face expressing that emotion
- Colors: a large rounded square filled with that color, slight drop shadow
- Numbers: that many identical simple star shapes arranged neatly
- Action verbs (run, jump, eat, sleep, swim, fly…): a minimal cartoon character performing the action
- Weather or nature words (rain, sun, snow, wind…): a clear simple scene showing that weather

The illustration must be immediately understandable to a 7-year-old child with no prior context. Do not include any letters, words, or numbers in the image.`;

// ── Distractor generation ────────────────────────────────────────────────────

function generateVisualDistractors(word: string): string[] {
  const misspellings = new Set<string>();
  const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
  const baseWord = word.trim().toLowerCase();

  for (let i = 0; i < baseWord.length - 1; i++) {
    if (baseWord[i] === baseWord[i + 1]) {
      misspellings.add(baseWord.slice(0, i) + baseWord.slice(i + 1));
    } else {
      misspellings.add(baseWord.slice(0, i + 1) + baseWord[i] + baseWord.slice(i + 1));
    }
  }

  for (let i = 0; i < baseWord.length; i++) {
    if (vowels.includes(baseWord[i])) {
      vowels.filter(v => v !== baseWord[i]).forEach(v => {
        misspellings.add(baseWord.slice(0, i) + v + baseWord.slice(i + 1));
      });
    }
  }

  for (let i = 0; i < baseWord.length - 1; i++) {
    misspellings.add(baseWord.slice(0, i) + baseWord[i + 1] + baseWord[i] + baseWord.slice(i + 2));
  }

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

  let soundsLike: string[] = [];
  try {
    const res = await fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(enLower)}&max=10`);
    const data = await res.json();
    soundsLike = data.map((item: { word: string }) => item.word.toLowerCase());
  } catch { }

  const visual = [...new Set([...generateVisualDistractors(enLower), ...soundsLike])]
    .filter((w: string) => /^[a-z\s]+$/i.test(w) && w !== enLower && w.length > 1)
    .slice(0, 20);

  return visual;
}

// ── Audio generation ─────────────────────────────────────────────────────────

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

// ── Image generation via Gemini ──────────────────────────────────────────────

async function generateAndUploadImage(en: string, supabase: SupabaseClient): Promise<string | null> {
  if (!geminiApiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: IMAGE_PROMPT(en) }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );

    if (!res.ok) {
      console.error('[IMG] Gemini error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );

    if (!part?.inlineData?.data) {
      console.error('[IMG] No image data in response');
      return null;
    }

    const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
    const mimeType: string = part.inlineData.mimeType || 'image/png';
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
    const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_')}.${ext}`;

    // Ensure bucket exists (silently ignores if already exists)
    await supabase.storage.createBucket('images', { public: true }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, { contentType: mimeType });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[IMG] Image generation failed:', err);
    return null;
  }
}

// ── Public actions ────────────────────────────────────────────────────────────

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

    const [distractors, audioUrl, imageUrl] = await Promise.all([
      getEnhancedDistractors(enNormalized),
      generateAndUploadAudio(enNormalized, supabase),
      generateAndUploadImage(enNormalized, supabase),
    ]);

    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{
        en: enNormalized,
        audio_url: audioUrl,
        distractors,
        image_url: imageUrl,
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

export async function regenerateWordImage(id: string) {
  if (!supabaseServiceKey) return { error: 'Unauthorized' };
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: word, error: fetchError } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const imageUrl = await generateAndUploadImage(word.en, supabase);
    if (!imageUrl) return { error: 'Generování obrázku selhalo' };

    const { error: updateError } = await supabase
      .from('vocabulary')
      .update({ image_url: imageUrl })
      .eq('id', id);
    if (updateError) throw updateError;

    return { success: true, image_url: imageUrl };
  } catch (err: unknown) {
    console.error('regenerateWordImage error:', err);
    return { error: (err as Error).message };
  }
}

export async function adminRegenerateAll() {
  if (!supabaseServiceKey) return { error: 'Unauthorized' };
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: words, error: fetchError } = await supabase.from('vocabulary').select('*');
    if (fetchError) throw fetchError;

    let updatedCount = 0;
    for (const word of (words || [])) {
      const [distractors, imageUrl] = await Promise.all([
        getEnhancedDistractors(word.en),
        word.image_url
          ? Promise.resolve(word.image_url as string)
          : generateAndUploadImage(word.en, supabase),
      ]);
      const audioUrl = word.audio_url || await generateAndUploadAudio(word.en, supabase);

      await supabase.from('vocabulary').update({
        distractors,
        audio_url: audioUrl,
        image_url: imageUrl,
      }).eq('id', word.id);
      updatedCount++;
    }

    return { success: true, count: updatedCount };
  } catch (err: unknown) {
    console.error('Admin regenerate error:', err);
    return { error: (err as Error).message };
  }
}
