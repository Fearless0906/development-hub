-- Create table to track completed coding challenges
CREATE TABLE public.user_challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  challenge_id text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  code_submitted text,
  UNIQUE (user_id, lesson_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view their own challenge completions"
ON public.user_challenge_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert their own challenge completions"
ON public.user_challenge_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own completions
CREATE POLICY "Users can update their own challenge completions"
ON public.user_challenge_completions
FOR UPDATE
USING (auth.uid() = user_id);