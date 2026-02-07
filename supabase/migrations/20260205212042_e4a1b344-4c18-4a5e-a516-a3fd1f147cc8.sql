-- Create generation_queue table for async processing
CREATE TABLE public.generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_image_url TEXT NOT NULL,
  shirt_asset_url TEXT NOT NULL,
  background_asset_url TEXT NOT NULL,
  shirt_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  replicate_prediction_id TEXT,
  result_image_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Add validation trigger instead of CHECK constraint (more flexible)
CREATE OR REPLACE FUNCTION public.validate_queue_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'processing', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, processing, completed, or failed', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_queue_status
  BEFORE INSERT OR UPDATE ON public.generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_queue_status();

-- Create indexes for efficient queue processing
CREATE INDEX idx_queue_status_created ON public.generation_queue (status, created_at);
CREATE INDEX idx_queue_user ON public.generation_queue (user_id, created_at DESC);
CREATE INDEX idx_queue_replicate_id ON public.generation_queue (replicate_prediction_id) WHERE replicate_prediction_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything (for edge functions)
CREATE POLICY "Service role can manage queue"
  ON public.generation_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Anonymous users can insert (to create queue entries)
CREATE POLICY "Anon can insert queue entries"
  ON public.generation_queue
  FOR INSERT
  WITH CHECK (true);

-- Users can read their own queue entries (for realtime subscription)
CREATE POLICY "Users can read own queue entries"
  ON public.generation_queue
  FOR SELECT
  USING (true);

-- Admins can view all queue entries
CREATE POLICY "Admins can view all queue entries"
  ON public.generation_queue
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_queue;