-- =============================================
-- DEVHUB DATABASE SCHEMA
-- =============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  github_username TEXT,
  reputation INTEGER NOT NULL DEFAULT 0,
  questions_count INTEGER NOT NULL DEFAULT 0,
  answers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. TAGS TABLE
-- =============================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3ECFB2',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert some default tags
INSERT INTO public.tags (name, slug, description, color) VALUES
  ('JavaScript', 'javascript', 'Questions about JavaScript programming', '#F7DF1E'),
  ('TypeScript', 'typescript', 'TypeScript language and tooling', '#3178C6'),
  ('React', 'react', 'React.js library and ecosystem', '#61DAFB'),
  ('Node.js', 'nodejs', 'Node.js runtime and packages', '#339933'),
  ('Python', 'python', 'Python programming language', '#3776AB'),
  ('CSS', 'css', 'Cascading Style Sheets and styling', '#1572B6'),
  ('HTML', 'html', 'HTML markup and structure', '#E34F26'),
  ('SQL', 'sql', 'SQL databases and queries', '#4479A1'),
  ('Git', 'git', 'Version control with Git', '#F05032'),
  ('API', 'api', 'API design and integration', '#FF6B6B');

-- =============================================
-- 3. QUESTIONS TABLE
-- =============================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  votes_count INTEGER NOT NULL DEFAULT 0,
  answers_count INTEGER NOT NULL DEFAULT 0,
  is_solved BOOLEAN NOT NULL DEFAULT false,
  accepted_answer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are viewable by everyone"
  ON public.questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create questions"
  ON public.questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions"
  ON public.questions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions"
  ON public.questions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_questions_user_id ON public.questions(user_id);
CREATE INDEX idx_questions_created_at ON public.questions(created_at DESC);
CREATE INDEX idx_questions_votes_count ON public.questions(votes_count DESC);

-- =============================================
-- 4. QUESTION_TAGS JUNCTION TABLE
-- =============================================
CREATE TABLE public.question_tags (
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question tags are viewable by everyone"
  ON public.question_tags FOR SELECT
  USING (true);

CREATE POLICY "Question owners can manage tags"
  ON public.question_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions 
      WHERE id = question_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Question owners can remove tags"
  ON public.question_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.questions 
      WHERE id = question_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- 5. ANSWERS TABLE
-- =============================================
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answers are viewable by everyone"
  ON public.answers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create answers"
  ON public.answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers"
  ON public.answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own answers"
  ON public.answers FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_answers_question_id ON public.answers(question_id);
CREATE INDEX idx_answers_user_id ON public.answers(user_id);
CREATE INDEX idx_answers_votes_count ON public.answers(votes_count DESC);

-- Add foreign key for accepted_answer after answers table exists
ALTER TABLE public.questions 
  ADD CONSTRAINT fk_accepted_answer 
  FOREIGN KEY (accepted_answer_id) 
  REFERENCES public.answers(id) ON DELETE SET NULL;

-- =============================================
-- 6. VOTES TABLE (Polymorphic)
-- =============================================
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voteable_type TEXT NOT NULL CHECK (voteable_type IN ('question', 'answer', 'snippet')),
  voteable_id UUID NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, voteable_type, voteable_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their votes"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_votes_voteable ON public.votes(voteable_type, voteable_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);

-- =============================================
-- 7. CODE SNIPPETS TABLE
-- =============================================
CREATE TABLE public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  is_public BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  votes_count INTEGER NOT NULL DEFAULT 0,
  forks_count INTEGER NOT NULL DEFAULT 0,
  forked_from UUID REFERENCES public.code_snippets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public snippets are viewable by everyone"
  ON public.code_snippets FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create snippets"
  ON public.code_snippets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snippets"
  ON public.code_snippets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snippets"
  ON public.code_snippets FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_snippets_updated_at
  BEFORE UPDATE ON public.code_snippets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_snippets_user_id ON public.code_snippets(user_id);
CREATE INDEX idx_snippets_language ON public.code_snippets(language);
CREATE INDEX idx_snippets_created_at ON public.code_snippets(created_at DESC);

-- =============================================
-- 8. SNIPPET_TAGS JUNCTION TABLE
-- =============================================
CREATE TABLE public.snippet_tags (
  snippet_id UUID NOT NULL REFERENCES public.code_snippets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (snippet_id, tag_id)
);

ALTER TABLE public.snippet_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snippet tags are viewable by everyone"
  ON public.snippet_tags FOR SELECT
  USING (true);

CREATE POLICY "Snippet owners can manage tags"
  ON public.snippet_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.code_snippets 
      WHERE id = snippet_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Snippet owners can remove tags"
  ON public.snippet_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.code_snippets 
      WHERE id = snippet_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- 9. HELPER FUNCTIONS FOR VOTE COUNTS
-- =============================================

-- Update question votes count
CREATE OR REPLACE FUNCTION public.update_question_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voteable_type = 'question' THEN
    UPDATE public.questions SET votes_count = votes_count + NEW.value WHERE id = NEW.voteable_id;
    UPDATE public.profiles SET reputation = reputation + (NEW.value * 5) 
      WHERE id = (SELECT user_id FROM public.questions WHERE id = NEW.voteable_id);
  ELSIF TG_OP = 'DELETE' AND OLD.voteable_type = 'question' THEN
    UPDATE public.questions SET votes_count = votes_count - OLD.value WHERE id = OLD.voteable_id;
    UPDATE public.profiles SET reputation = reputation - (OLD.value * 5) 
      WHERE id = (SELECT user_id FROM public.questions WHERE id = OLD.voteable_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.voteable_type = 'question' THEN
    UPDATE public.questions SET votes_count = votes_count - OLD.value + NEW.value WHERE id = NEW.voteable_id;
    UPDATE public.profiles SET reputation = reputation + ((NEW.value - OLD.value) * 5) 
      WHERE id = (SELECT user_id FROM public.questions WHERE id = NEW.voteable_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update answer votes count
CREATE OR REPLACE FUNCTION public.update_answer_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voteable_type = 'answer' THEN
    UPDATE public.answers SET votes_count = votes_count + NEW.value WHERE id = NEW.voteable_id;
    UPDATE public.profiles SET reputation = reputation + (NEW.value * 10) 
      WHERE id = (SELECT user_id FROM public.answers WHERE id = NEW.voteable_id);
  ELSIF TG_OP = 'DELETE' AND OLD.voteable_type = 'answer' THEN
    UPDATE public.answers SET votes_count = votes_count - OLD.value WHERE id = OLD.voteable_id;
    UPDATE public.profiles SET reputation = reputation - (OLD.value * 10) 
      WHERE id = (SELECT user_id FROM public.answers WHERE id = OLD.voteable_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.voteable_type = 'answer' THEN
    UPDATE public.answers SET votes_count = votes_count - OLD.value + NEW.value WHERE id = NEW.voteable_id;
    UPDATE public.profiles SET reputation = reputation + ((NEW.value - OLD.value) * 10) 
      WHERE id = (SELECT user_id FROM public.answers WHERE id = NEW.voteable_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update snippet votes count
CREATE OR REPLACE FUNCTION public.update_snippet_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voteable_type = 'snippet' THEN
    UPDATE public.code_snippets SET votes_count = votes_count + NEW.value WHERE id = NEW.voteable_id;
    UPDATE public.profiles SET reputation = reputation + (NEW.value * 3) 
      WHERE id = (SELECT user_id FROM public.code_snippets WHERE id = NEW.voteable_id);
  ELSIF TG_OP = 'DELETE' AND OLD.voteable_type = 'snippet' THEN
    UPDATE public.code_snippets SET votes_count = votes_count - OLD.value WHERE id = OLD.voteable_id;
    UPDATE public.profiles SET reputation = reputation - (OLD.value * 3) 
      WHERE id = (SELECT user_id FROM public.code_snippets WHERE id = OLD.voteable_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.voteable_type = 'snippet' THEN
    UPDATE public.code_snippets SET votes_count = votes_count - OLD.value + NEW.value WHERE id = NEW.voteable_id;
    UPDATE public.profiles SET reputation = reputation + ((NEW.value - OLD.value) * 3) 
      WHERE id = (SELECT user_id FROM public.code_snippets WHERE id = NEW.voteable_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_question
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_question_votes();

CREATE TRIGGER on_vote_answer
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_answer_votes();

CREATE TRIGGER on_vote_snippet
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_snippet_votes();

-- Update answer count on questions
CREATE OR REPLACE FUNCTION public.update_question_answers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.questions SET answers_count = answers_count + 1 WHERE id = NEW.question_id;
    UPDATE public.profiles SET answers_count = answers_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.questions SET answers_count = answers_count - 1 WHERE id = OLD.question_id;
    UPDATE public.profiles SET answers_count = answers_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_answer_change
  AFTER INSERT OR DELETE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.update_question_answers_count();

-- Update question count on profiles
CREATE OR REPLACE FUNCTION public.update_profile_questions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET questions_count = questions_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET questions_count = questions_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_question_change
  AFTER INSERT OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_questions_count();

-- Update tag usage count
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_question_tag_change
  AFTER INSERT OR DELETE ON public.question_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

CREATE TRIGGER on_snippet_tag_change
  AFTER INSERT OR DELETE ON public.snippet_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();