-- Create consent logs table for LGPD compliance
CREATE TABLE public.consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'image_upload',
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  consent_text TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert consent (anonymous users included)
CREATE POLICY "Anyone can log consent" 
ON public.consent_logs 
FOR INSERT 
WITH CHECK (true);

-- Policy: Only admins can read consent logs
CREATE POLICY "Admins can view consent logs" 
ON public.consent_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX idx_consent_logs_accepted_at ON public.consent_logs(accepted_at DESC);