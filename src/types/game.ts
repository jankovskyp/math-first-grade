export type Operation = 'addition' | 'subtraction' | 'comparison';
export type NumberRange = 10 | 20 | 100;

export interface Problem {
  id: string;
  type: Operation;
  a: number;
  b: number;
  result: number | string;
  options: (number | string)[];
  displayOperator: string;
}

export type GameMode = 'training' | 'competition';
export type GameState = 'HOME' | 'SETUP' | 'PLAYING' | 'RESULTS' | 'LEADERBOARD';

export interface GameStats {
  correct: number;
  total: number;
  errors: number;
  percentage: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  player_id?: string;
  avatar?: string;
  score: number;      // Correct answers
  errors: number;     // Wrong answers
  total: number;      // Total attempts
  accuracy: number;   // Success rate in %
  range: NumberRange;
  date: string;
}
