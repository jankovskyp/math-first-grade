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
  const correctWord = words[getRandomInt(0, words.length - 1)];
  const id = Math.random().toString(36).substring(2, 9);

  const generateMisspellings = (word: string): string[] => {
    const misspellings = new Set<string>();
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const w = word.toLowerCase();

    // 1. Double letters or remove double letters
    for (let i = 0; i < w.length - 1; i++) {
      if (w[i] === w[i + 1]) {
        misspellings.add(w.slice(0, i) + w.slice(i + 1)); // remove one
      } else {
        misspellings.add(w.slice(0, i + 1) + w[i] + w.slice(i + 1)); // double it
      }
    }

    // 2. Replace vowels with other vowels
    for (let i = 0; i < w.length; i++) {
      if (vowels.includes(w[i])) {
        vowels.filter(v => v !== w[i]).forEach(v => {
          misspellings.add(w.slice(0, i) + v + w.slice(i + 1));
        });
      }
    }

    // 3. Swap adjacent letters
    for (let i = 0; i < w.length - 1; i++) {
      misspellings.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }

    // 4. Common phonetic replacements
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

    // 5. Remove one letter (for short words, don't remove if length <= 2)
    if (w.length > 2) {
      for (let i = 0; i < w.length; i++) {
        misspellings.add(w.slice(0, i) + w.slice(i + 1));
      }
    }

    // Avoid empty or single-character nonsense unless original is short
    return Array.from(misspellings).filter(m => m !== w && m.length > (w.length > 2 ? 1 : 0));
  };

  // Pool of basic words for generic fallback
  const basicPool = ['cat', 'dog', 'apple', 'sun', 'red', 'blue', 'one', 'car', 'tree', 'book'];

  const getOptions = () => {
    // In simplified mode, distractors are just a flat list of strings (similar English words)
    const baseWord = correctWord.en.trim();
    const candidates = correctWord.distractors || [];

    // Generate misspellings to use as strong distractors
    const generatedDistractors = generateMisspellings(baseWord);

    // Mix provided distractors and generated ones
    let finalPool = [...new Set([...candidates, ...generatedDistractors])];

    // Filter out words with special characters (bullets, dashes, numbers, etc)
    finalPool = finalPool.filter(w => /^[a-z\s]+$/i.test(w));

    // Fallback: Add other words from the main vocabulary that have similar length
    if (finalPool.length < 3) {
      const sameLengthWords = words
        .filter(w => w.id !== correctWord.id && Math.abs(w.en.length - baseWord.length) <= 1)
        .map(w => w.en);
      finalPool = [...new Set([...finalPool, ...sameLengthWords, ...basicPool])];
    }

    // Filter out the correct answer from the distractors pool
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
  }
};

export const playAudio = (url: string) => {
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(e => console.error('Failed to play audio:', e));
};
