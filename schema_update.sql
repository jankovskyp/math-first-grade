-- Create the players table
CREATE TABLE public.players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  pin text NOT NULL,
  avatar text NOT NULL,
  recovery_question text NOT NULL,
  recovery_answer text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Ensure Row Level Security (RLS) is appropriately configured if enabled.
-- Enable RLS (Optional depending on current setup, assuming anonymous access for now)
-- ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anonymous read all" ON public.players FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON public.players FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous update" ON public.players FOR UPDATE USING (true);

-- Adding player_id to math leaderboard
ALTER TABLE public.leaderboard
ADD COLUMN player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

-- Adding player_id to english leaderboard
ALTER TABLE public.english_leaderboard
ADD COLUMN player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;
