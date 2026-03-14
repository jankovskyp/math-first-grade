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

  // Generate options using distractors if available
  const getOptions = (isEn: boolean) => {
    const distractors = correctWord.distractors || [];
    let optionsList: string[] = [];

    if (distractors.length > 0) {
      // Use smart distractors
      optionsList = distractors.map((d: any) => isEn ? d.en : d.cz);
    }

    // Add other words from vocabulary if we don't have enough distractors
    const otherWords = words
      .filter(w => w.id !== correctWord.id)
      .map(w => isEn ? w.en : w.cz);
    
    optionsList = shuffleArray([...new Set([...optionsList, ...otherWords])]).slice(0, 3);
    return shuffleArray([isEn ? correctWord.en : correctWord.cz, ...optionsList]);
  };

  switch (mode) {
    case 'en-cz':
      return {
        id,
        type: mode,
        questionText: correctWord.en,
        correctAnswer: correctWord.cz,
        options: getOptions(false),
        audioUrl: correctWord.audio_url
      };
    case 'cz-en':
      return {
        id,
        type: mode,
        questionText: correctWord.cz,
        correctAnswer: correctWord.en,
        options: getOptions(true),
        audioUrl: correctWord.audio_url
      };
    case 'listen':
      return {
        id,
        type: mode,
        questionText: '?',
        correctAnswer: correctWord.en,
        options: getOptions(true),
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
