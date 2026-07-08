-- Fix: SUPA_rls_policy_always_true
-- The "System can create notifications" policy on public.notifications used WITH CHECK (true).
-- Notifications are only created by SECURITY DEFINER trigger functions (notify_question_answered,
-- notify_upvote, notify_answer_accepted), which bypass RLS. No client-facing INSERT policy is needed.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Fix: answer_self_acceptance
-- Prevent answer authors from setting is_accepted = true on their own answers.
-- Only the owner of the parent question may accept an answer.
CREATE OR REPLACE FUNCTION public.validate_answer_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when is_accepted is transitioning to true
  IF NEW.is_accepted = true AND (OLD.is_accepted IS DISTINCT FROM true) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.questions
      WHERE id = NEW.question_id
        AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the question owner can accept an answer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_answer_acceptance ON public.answers;
CREATE TRIGGER enforce_answer_acceptance
  BEFORE UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_answer_acceptance();

-- Fix: security_definer_funcs
-- Harden the vote-count trigger functions with existence checks so that manipulated
-- votes.voteable_id values cannot silently affect denormalized counters/reputation.
CREATE OR REPLACE FUNCTION public.update_question_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voteable_type = 'question' THEN
    IF EXISTS (SELECT 1 FROM public.questions WHERE id = NEW.voteable_id) THEN
      UPDATE public.questions SET votes_count = votes_count + NEW.value WHERE id = NEW.voteable_id;
      UPDATE public.profiles SET reputation = reputation + (NEW.value * 5)
        WHERE id = (SELECT user_id FROM public.questions WHERE id = NEW.voteable_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.voteable_type = 'question' THEN
    IF EXISTS (SELECT 1 FROM public.questions WHERE id = OLD.voteable_id) THEN
      UPDATE public.questions SET votes_count = votes_count - OLD.value WHERE id = OLD.voteable_id;
      UPDATE public.profiles SET reputation = reputation - (OLD.value * 5)
        WHERE id = (SELECT user_id FROM public.questions WHERE id = OLD.voteable_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.voteable_type = 'question' THEN
    IF EXISTS (SELECT 1 FROM public.questions WHERE id = NEW.voteable_id) THEN
      UPDATE public.questions SET votes_count = votes_count - OLD.value + NEW.value WHERE id = NEW.voteable_id;
      UPDATE public.profiles SET reputation = reputation + ((NEW.value - OLD.value) * 5)
        WHERE id = (SELECT user_id FROM public.questions WHERE id = NEW.voteable_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_answer_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voteable_type = 'answer' THEN
    IF EXISTS (SELECT 1 FROM public.answers WHERE id = NEW.voteable_id) THEN
      UPDATE public.answers SET votes_count = votes_count + NEW.value WHERE id = NEW.voteable_id;
      UPDATE public.profiles SET reputation = reputation + (NEW.value * 10)
        WHERE id = (SELECT user_id FROM public.answers WHERE id = NEW.voteable_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.voteable_type = 'answer' THEN
    IF EXISTS (SELECT 1 FROM public.answers WHERE id = OLD.voteable_id) THEN
      UPDATE public.answers SET votes_count = votes_count - OLD.value WHERE id = OLD.voteable_id;
      UPDATE public.profiles SET reputation = reputation - (OLD.value * 10)
        WHERE id = (SELECT user_id FROM public.answers WHERE id = OLD.voteable_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.voteable_type = 'answer' THEN
    IF EXISTS (SELECT 1 FROM public.answers WHERE id = NEW.voteable_id) THEN
      UPDATE public.answers SET votes_count = votes_count - OLD.value + NEW.value WHERE id = NEW.voteable_id;
      UPDATE public.profiles SET reputation = reputation + ((NEW.value - OLD.value) * 10)
        WHERE id = (SELECT user_id FROM public.answers WHERE id = NEW.voteable_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_snippet_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voteable_type = 'snippet' THEN
    IF EXISTS (SELECT 1 FROM public.code_snippets WHERE id = NEW.voteable_id) THEN
      UPDATE public.code_snippets SET votes_count = votes_count + NEW.value WHERE id = NEW.voteable_id;
      UPDATE public.profiles SET reputation = reputation + (NEW.value * 3)
        WHERE id = (SELECT user_id FROM public.code_snippets WHERE id = NEW.voteable_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.voteable_type = 'snippet' THEN
    IF EXISTS (SELECT 1 FROM public.code_snippets WHERE id = OLD.voteable_id) THEN
      UPDATE public.code_snippets SET votes_count = votes_count - OLD.value WHERE id = OLD.voteable_id;
      UPDATE public.profiles SET reputation = reputation - (OLD.value * 3)
        WHERE id = (SELECT user_id FROM public.code_snippets WHERE id = OLD.voteable_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.voteable_type = 'snippet' THEN
    IF EXISTS (SELECT 1 FROM public.code_snippets WHERE id = NEW.voteable_id) THEN
      UPDATE public.code_snippets SET votes_count = votes_count - OLD.value + NEW.value WHERE id = NEW.voteable_id;
      UPDATE public.profiles SET reputation = reputation + ((NEW.value - OLD.value) * 3)
        WHERE id = (SELECT user_id FROM public.code_snippets WHERE id = NEW.voteable_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;