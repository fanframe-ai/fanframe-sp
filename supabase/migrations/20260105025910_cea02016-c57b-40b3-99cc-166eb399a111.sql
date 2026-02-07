-- Create table for OpenAI API key management
CREATE TABLE public.openai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  secret_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT max_priority CHECK (priority >= 1 AND priority <= 3),
  CONSTRAINT unique_priority UNIQUE (priority)
);

-- Enable RLS
ALTER TABLE public.openai_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can view API keys" 
ON public.openai_api_keys 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert API keys" 
ON public.openai_api_keys 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update API keys" 
ON public.openai_api_keys 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete API keys" 
ON public.openai_api_keys 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Insert the current key as the first one
INSERT INTO public.openai_api_keys (name, secret_name, priority, is_active)
VALUES ('API Key Principal', 'OPENAI_API_KEY', 1, true);

-- Add comment
COMMENT ON TABLE public.openai_api_keys IS 'Manages OpenAI API keys for failover redundancy';