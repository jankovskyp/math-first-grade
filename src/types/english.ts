export type EnglishMode = 'listen' | 'spelling';

export interface VocabularyWord {
  id: string;
  en: string;
  audio_url?: string;
  created_at: string;
  distractors?: string[]; // Only visual/phonetic similar words
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
  player_id?: string;
  avatar?: string;
  score: number;
  errors: number;
  total: number;
  accuracy: number;
  mode: EnglishMode | 'mixed';
  date: string;
}
