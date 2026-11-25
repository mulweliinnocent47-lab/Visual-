-- Per-user rate limit for the ai-block-generator edge function.
-- The table has RLS enabled and no policies, so only the service role (used by the
-- edge function) can read or write it. Browser clients cannot touch it.

CREATE TABLE public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX ai_usage_user_created_idx ON public.ai_usage (user_id, created_at DESC);

-- Records one AI build for the user if they are under the limit.
-- Returns true when the build is allowed, false when the limit is reached.
-- The advisory lock stops two parallel requests from both slipping under the limit.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id UUID,
  p_limit INTEGER,
  p_window INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT count(*) INTO used
  FROM public.ai_usage
  WHERE user_id = p_user_id AND created_at > now() - p_window;

  IF used >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage (user_id) VALUES (p_user_id);

  -- Keep the table small: remove this user's rows older than a day.
  DELETE FROM public.ai_usage
  WHERE user_id = p_user_id AND created_at < now() - INTERVAL '1 day';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(UUID, INTEGER, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(UUID, INTEGER, INTERVAL) TO service_role;
