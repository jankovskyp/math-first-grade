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
  if (words.length < 4) return null;

  const mode = modes[getRandomInt(0, modes.length - 1)];
  const correctWord = words[getRandomInt(0, words.length - 1)];
  
  const wrongWords = shuffleArray(words.filter(w => w.id !== correctWord.id)).slice(0, 3);
  const optionsList = shuffleArray([correctWord, ...wrongWords]);

  const id = Math.random().toString(36).substring(2, 9);

  switch (mode) {
    case 'en-cz':
      return {
        id,
        type: mode,
        questionText: correctWord.en,
        correctAnswer: correctWord.cz,
        options: optionsList.map(w => w.cz),
        audioUrl: correctWord.audio_url
      };
    case 'cz-en':
      return {
        id,
        type: mode,
        questionText: correctWord.cz,
        correctAnswer: correctWord.en,
        options: optionsList.map(w => w.en),
        audioUrl: correctWord.audio_url // Pre-load audio even if not listen mode
      };
    case 'listen':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en,
        options: optionsList.map(w => w.en),
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
  if (!url) {
    console.warn('No audio URL provided');
    return;
  }
  
  const audio = new Audio(url);
  // Ensure we set crossOrigin for cloud storage files if needed, 
  // but for public Supabase URLs it should work fine.
  audio.play().catch(e => {
    console.error('Failed to play audio from:', url, e);
  });
};
