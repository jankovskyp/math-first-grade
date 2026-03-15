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

  // Pool of basic words for generic fallback
  const basicPool = ['cat', 'dog', 'apple', 'sun', 'red', 'blue', 'one', 'car', 'tree', 'book'];

  const getOptions = (isEn: boolean, type: 'semantic' | 'visual') => {
    let candidates: string[] = [];
    
    if (correctWord.distractors) {
      if (type === 'semantic') {
        candidates = correctWord.distractors.semantic.map(d => isEn ? d.en : d.cz);
      } else {
        candidates = correctWord.distractors.visual; // Visual always uses EN words
      }
    }

    // Fallback: Add other words from the main vocabulary
    const otherWords = words
      .filter(w => w.id !== correctWord.id)
      .map(w => isEn ? w.en : w.cz);
    
    // Final mixing and slicing
    let finalPool = [...new Set([...candidates, ...otherWords, ...basicPool])];
    finalPool = finalPool.filter(w => w.toLowerCase() !== (isEn ? correctWord.en : correctWord.cz).toLowerCase());
    
    return shuffleArray([isEn ? correctWord.en : correctWord.cz, ...shuffleArray(finalPool).slice(0, 3)]);
  };

  switch (mode) {
    case 'en-cz':
      return {
        id,
        type: mode,
        questionText: correctWord.en,
        correctAnswer: correctWord.cz,
        options: getOptions(false, 'semantic'),
        audioUrl: correctWord.audio_url
      };
    case 'cz-en':
      return {
        id,
        type: mode,
        questionText: correctWord.cz,
        correctAnswer: correctWord.en,
        options: getOptions(true, 'semantic'),
        audioUrl: correctWord.audio_url
      };
    case 'listen':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en,
        options: getOptions(true, 'visual'),
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
