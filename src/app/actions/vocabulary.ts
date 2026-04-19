'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

// ── Universal image generation prompt ────────────────────────────────────────

const IMAGE_PROMPT = (word: string) => `Create a simple educational flashcard illustration for the English word: "${word}"

ABSOLUTE RULE — ZERO TEXT IN THE IMAGE: No letters, no words, no numbers, no labels, no captions anywhere in the illustration. Not even a single character. The image must work entirely through pictures and symbols.

Style: flat vector illustration, pure white background, bright friendly colors, clean bold outlines, suitable for children aged 6–10. Square format, well-centered.

How to make the concept unambiguous:
- If the word describes a property of one object among others (small, short, young, old, tall, long, dark, light…): draw TWO similar objects showing the contrast, then add a bold red arrow pointing at the one that represents the word. Example for "small": draw a big apple and a small apple, with a red arrow pointing at the small apple.
- If the word is a concrete noun or body part: draw that single object clearly, large, centered.
- If the word is an emotion or facial expression: draw a single round cartoon face with an exaggerated expression matching the word.
- If the word is a spatial preposition (in, on, under, next to, behind, between…): show a red ball and a simple wooden box with the ball in the exact position the word describes.
- If the word is a pronoun or abstract function word (he, she, they, we, you, my, your, i am…): show simple cartoon characters with a pointing gesture or arrow that conveys the relationship — one character pointing to self for "my/i am", pointing at another for "you/your", two characters side by side for "they/we", etc.
- For question words (what, when, where, who, why, how): a cartoon character with a large "?" speech bubble (drawn as a graphic symbol shape, not a letter).

The image must be immediately obvious to a 7-year-old seeing it for the first time with no other context. Use arrows, highlights, or visual focus to remove any ambiguity about which concept is being illustrated. NO TEXT, NO LETTERS, NO NUMBERS anywhere in the image.`;

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
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY není nastaven');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: IMAGE_PROMPT(en) }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('[IMG] Gemini error:', res.status, body);
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
  );

  if (!part?.inlineData?.data) {
    const raw = JSON.stringify(data).slice(0, 300);
    console.error('[IMG] No image data in response:', raw);
    throw new Error(`Gemini nevrátil obrázek. Response: ${raw}`);
  }

  const mimeType: string = part.inlineData.mimeType || 'image/png';
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
  const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
  const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

  // Ensure bucket exists (silently ignores if already exists)
  await supabase.storage.createBucket('images', { public: true }).catch(() => {});

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, imageBuffer, { contentType: mimeType });

  if (uploadError) throw new Error(`Supabase upload: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
  return publicUrl;
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
      generateAndUploadImage(enNormalized, supabase).catch((err: Error) => {
        console.error('[IMG] Skipping image for new word:', err.message);
        return null;
      }),
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
