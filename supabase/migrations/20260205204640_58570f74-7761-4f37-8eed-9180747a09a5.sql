-- Fase 1.1: Rate Limiting Table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'generation',
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, action)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for rate_limits
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view rate limits"
ON public.rate_limits FOR SELECT
USING (is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits (user_id, action);

-- Fase 1.2: Composite index for dashboard performance
CREATE INDEX idx_generations_status_created ON public.generations (status, created_at DESC);

-- Fase 2.1: Cleanup function for old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;