-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System can create notifications (via triggers)
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function for new answer notifications
CREATE OR REPLACE FUNCTION public.notify_question_answered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  question_owner_id UUID;
  question_title TEXT;
  answerer_username TEXT;
BEGIN
  -- Get the question owner and title
  SELECT user_id, title INTO question_owner_id, question_title
  FROM public.questions WHERE id = NEW.question_id;
  
  -- Get answerer username
  SELECT username INTO answerer_username
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Don't notify if user answers their own question
  IF question_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, actor_id)
    VALUES (
      question_owner_id,
      'new_answer',
      'New answer to your question',
      answerer_username || ' answered your question "' || LEFT(question_title, 50) || CASE WHEN LENGTH(question_title) > 50 THEN '..."' ELSE '"' END,
      '/questions/' || NEW.question_id,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new answers
CREATE TRIGGER on_new_answer_notify
  AFTER INSERT ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_question_answered();

-- Trigger function for upvote notifications
CREATE OR REPLACE FUNCTION public.notify_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_owner_id UUID;
  content_title TEXT;
  voter_username TEXT;
  notification_link TEXT;
  notification_title TEXT;
BEGIN
  -- Only notify on upvotes (value = 1), not on inserts of downvotes or updates
  IF NEW.value != 1 THEN
    RETURN NEW;
  END IF;
  
  -- Get voter username
  SELECT username INTO voter_username
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Handle different voteable types
  IF NEW.voteable_type = 'question' THEN
    SELECT user_id, title INTO content_owner_id, content_title
    FROM public.questions WHERE id = NEW.voteable_id;
    notification_link := '/questions/' || NEW.voteable_id;
    notification_title := 'Your question was upvoted';
    
  ELSIF NEW.voteable_type = 'answer' THEN
    SELECT a.user_id, q.title INTO content_owner_id, content_title
    FROM public.answers a
    JOIN public.questions q ON q.id = a.question_id
    WHERE a.id = NEW.voteable_id;
    notification_link := '/questions/' || (SELECT question_id FROM public.answers WHERE id = NEW.voteable_id);
    notification_title := 'Your answer was upvoted';
    
  ELSIF NEW.voteable_type = 'snippet' THEN
    SELECT user_id, title INTO content_owner_id, content_title
    FROM public.code_snippets WHERE id = NEW.voteable_id;
    notification_link := '/snippets/' || NEW.voteable_id;
    notification_title := 'Your snippet was upvoted';
  END IF;
  
  -- Don't notify if user upvotes their own content
  IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, actor_id)
    VALUES (
      content_owner_id,
      'upvote',
      notification_title,
      voter_username || ' upvoted "' || LEFT(content_title, 50) || CASE WHEN LENGTH(content_title) > 50 THEN '..."' ELSE '"' END,
      notification_link,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for upvotes
CREATE TRIGGER on_upvote_notify
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_upvote();

-- Trigger function for accepted answer notifications
CREATE OR REPLACE FUNCTION public.notify_answer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  answer_owner_id UUID;
  question_title TEXT;
  question_owner_username TEXT;
BEGIN
  -- Only trigger when is_accepted changes to true
  IF NEW.is_accepted = true AND (OLD.is_accepted = false OR OLD.is_accepted IS NULL) THEN
    -- Get question details
    SELECT q.title, p.username INTO question_title, question_owner_username
    FROM public.questions q
    JOIN public.profiles p ON p.id = q.user_id
    WHERE q.id = NEW.question_id;
    
    -- Don't notify if user accepts their own answer
    IF NEW.user_id != (SELECT user_id FROM public.questions WHERE id = NEW.question_id) THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, actor_id)
      VALUES (
        NEW.user_id,
        'answer_accepted',
        'Your answer was accepted!',
        question_owner_username || ' accepted your answer on "' || LEFT(question_title, 50) || CASE WHEN LENGTH(question_title) > 50 THEN '..."' ELSE '"' END,
        '/questions/' || NEW.question_id,
        (SELECT user_id FROM public.questions WHERE id = NEW.question_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for accepted answers
CREATE TRIGGER on_answer_accepted_notify
  AFTER UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_answer_accepted();