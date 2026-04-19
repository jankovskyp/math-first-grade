export type EnglishMode = 'listen' | 'spelling' | 'picture';

export interface VocabularyWord {
  id: string;
  en: string;
  audio_url?: string;
  image_url?: string;
  created_at: string;
  distractors?: string[];
}

export interface EnglishProblem {
  id: string;
  type: EnglishMode;
  questionText: string;
  correctAnswer: string;
  options?: string[];
  audioUrl?: string;
  // Picture mode
  pictureVariant?: 'picture_to_word' | 'word_to_picture';
  questionImageUrl?: string;
  imageOptions?: { word: string; imageUrl: string }[];
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
