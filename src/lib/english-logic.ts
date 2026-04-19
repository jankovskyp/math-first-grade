import { EnglishMode, EnglishProblem, VocabularyWord } from '../types/english';

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const generateEnglishProblem = (
  words: VocabularyWord[],
  modes: EnglishMode[]
): EnglishProblem | null => {
  if (words.length < 1) return null;

  const mode = modes[getRandomInt(0, modes.length - 1)];
  const id = Math.random().toString(36).substring(2, 9);

  // ── Picture mode ──────────────────────────────────────────────────────────
  if (mode === 'picture') {
    const wordsWithImages = words.filter(w => w.image_url);
    if (wordsWithImages.length === 0) return null;

    const correctWord = wordsWithImages[getRandomInt(0, wordsWithImages.length - 1)];
    const canDoWordToPicture = wordsWithImages.length >= 4;
    const pictureVariant: 'picture_to_word' | 'word_to_picture' =
      canDoWordToPicture && Math.random() > 0.5 ? 'word_to_picture' : 'picture_to_word';

    if (pictureVariant === 'picture_to_word') {
      // Show image → player picks the correct word from 4 options
      const others = shuffleArray(words.filter(w => w.id !== correctWord.id));
      const distractors = others.slice(0, 3).map(w => w.en);
      return {
        id,
        type: 'picture',
        questionText: '?',
        questionImageUrl: correctWord.image_url,
        correctAnswer: correctWord.en,
        options: shuffleArray([correctWord.en, ...distractors]),
        audioUrl: correctWord.audio_url,
        pictureVariant: 'picture_to_word',
      };
    } else {
      // Show word → player picks the correct image from 4 options
      const distractors = shuffleArray(
        wordsWithImages.filter(w => w.id !== correctWord.id)
      ).slice(0, 3);
      return {
        id,
        type: 'picture',
        questionText: correctWord.en.toUpperCase(),
        correctAnswer: correctWord.en,
        imageOptions: shuffleArray([
          { word: correctWord.en, imageUrl: correctWord.image_url! },
          ...distractors.map(w => ({ word: w.en, imageUrl: w.image_url! })),
        ]),
        audioUrl: correctWord.audio_url,
        pictureVariant: 'word_to_picture',
      };
    }
  }

  // ── Listen & Spelling modes ───────────────────────────────────────────────

  const correctWord = words[getRandomInt(0, words.length - 1)];

  const generateMisspellings = (word: string): string[] => {
    const misspellings = new Set<string>();
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const w = word.toLowerCase();

    for (let i = 0; i < w.length - 1; i++) {
      if (w[i] === w[i + 1]) {
        misspellings.add(w.slice(0, i) + w.slice(i + 1));
      } else {
        misspellings.add(w.slice(0, i + 1) + w[i] + w.slice(i + 1));
      }
    }

    for (let i = 0; i < w.length; i++) {
      if (vowels.includes(w[i])) {
        vowels.filter(v => v !== w[i]).forEach(v => {
          misspellings.add(w.slice(0, i) + v + w.slice(i + 1));
        });
      }
    }

    for (let i = 0; i < w.length - 1; i++) {
      misspellings.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }

    const phoneticMap: Record<string, string[]> = {
      'ph': ['f'], 'f': ['ph', 'v'], 'c': ['k', 's'], 'k': ['c'], 's': ['c', 'z'], 'z': ['s'],
      'ea': ['ee', 'e'], 'ee': ['ea', 'i'], 'ou': ['ow', 'o'], 'ow': ['ou'], 'th': ['d', 't', 'f'],
      'ch': ['sh', 'tch'], 'sh': ['ch'], 'w': ['v'], 'v': ['w'], 'i': ['y'], 'y': ['i', 'j']
    };

    for (const [key, values] of Object.entries(phoneticMap)) {
      if (w.includes(key)) {
        values.forEach(val => {
          misspellings.add(w.replace(key, val));
        });
      }
    }

    if (w.length > 2) {
      for (let i = 0; i < w.length; i++) {
        misspellings.add(w.slice(0, i) + w.slice(i + 1));
      }
    }

    return Array.from(misspellings).filter(m => m !== w && m.length > (w.length > 2 ? 1 : 0));
  };

  const basicPool = ['cat', 'dog', 'apple', 'sun', 'red', 'blue', 'one', 'car', 'tree', 'book'];

  const getOptions = () => {
    const baseWord = correctWord.en.trim();
    const candidates = correctWord.distractors || [];
    const generatedDistractors = generateMisspellings(baseWord);

    let finalPool = [...new Set([...candidates, ...generatedDistractors])];
    finalPool = finalPool.filter(w => /^[a-z\s]+$/i.test(w));

    if (finalPool.length < 3) {
      const sameLengthWords = words
        .filter(w => w.id !== correctWord.id && Math.abs(w.en.length - baseWord.length) <= 1)
        .map(w => w.en);
      finalPool = [...new Set([...finalPool, ...sameLengthWords, ...basicPool])];
    }

    finalPool = finalPool.filter(w => w.toLowerCase() !== baseWord.toLowerCase());
    return shuffleArray([baseWord, ...shuffleArray(finalPool).slice(0, 3)]);
  };

  switch (mode) {
    case 'listen':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en,
        options: getOptions(),
        audioUrl: correctWord.audio_url
      };
    case 'spelling':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en.toLowerCase(),
        audioUrl: correctWord.audio_url
      };
    default:
      return null;
  }
};

export const playAudio = (url: string) => {
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(e => console.error('Failed to play audio:', e));
};
