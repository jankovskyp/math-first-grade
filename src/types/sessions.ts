export interface SessionAnswer {
  question: string;       // math: "5+3", english: the word
  correctAnswer: string;  // math: "8", english: same word
  wasCorrect: boolean;    // true = got it right with no prior errors on this problem
}

export interface GameSession {
  id: string;
  player_id?: string;
  subject: 'math' | 'english';
  game_mode: 'training' | 'competition';
  submode: string;        // math: '10'|'20'|'100' / english: 'listen'|'spelling'|'picture'
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
  score: number;
  answers: SessionAnswer[];
  created_at: string;
}
