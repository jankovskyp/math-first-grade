export type EnglishMode = 'en-cz' | 'cz-en' | 'listen' | 'spelling';

export interface VocabularyWord {
  id: string;
  en: string;
  cz: string;
  audio_url?: string;
  created_at: string;
  distractors?: {
    semantic: { en: string; cz: string }[]; // Words related by meaning (cat, puppy for "dog")
    visual: string[]; // Words that look or sound similar (dot, dig, dogs for "dog")
  };
}

export interface EnglishProblem {
  id: string;
  type: EnglishMode;
  questionText: string;
  correctAnswer: string;
  options?: string[];
  audioUrl?: string;
}

export type EnglishGameState = 'HOME' | 'SETUP' | 'PLAYING' | 'RESULTS' | 'LEADERBOARD';

export interface EnglishStats {
  correct: number;
  total: number;
  errors: number;
  percentage: number;
}

export interface EnglishLeaderboardEntry {
  id: string;
  name: string;
  score: number;
  errors: number;
  total: number;
  accuracy: number;
  mode: EnglishMode | 'mixed';
  date: string;
}
