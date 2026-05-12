-- Run this in your Supabase SQL editor to create the session history table

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  subject text NOT NULL,       -- 'math' | 'english'
  game_mode text NOT NULL,     -- 'training' | 'competition'
  submode text,                -- math: '10'|'20'|'100'  /  english: 'listen'|'spelling'|'picture'
  correct integer NOT NULL DEFAULT 0,
  incorrect integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS game_sessions_player_id_idx ON public.game_sessions(player_id);
CREATE INDEX IF NOT EXISTS game_sessions_created_at_idx ON public.game_sessions(created_at DESC);

-- Disable RLS to match the leaderboard tables (anonymous access)
ALTER TABLE public.game_sessions DISABLE ROW LEVEL SECURITY;
