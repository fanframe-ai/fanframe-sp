-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create system_settings table for configurable settings like prompts
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can view settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.system_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Service role can read (for edge functions)
CREATE POLICY "Service role can read settings"
ON public.system_settings FOR SELECT
TO service_role
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the current prompt
INSERT INTO public.system_settings (key, value, description) VALUES (
  'generation_prompt',
  'Virtual try-on: Transform this person to wear the São Paulo FC jersey (Tricolor).

RULES:
- Preserve the person''s face, body proportions and pose exactly
- Replace only the upper body clothing with the São Paulo FC jersey
- Ensure realistic fabric folds and natural fit
- Place the person in the museum background setting
- Match lighting to indoor museum environment
- Maintain photorealistic quality, 8K resolution, sharp focus
- Professional DSLR camera quality',
  'Prompt usada para gerar imagens no Seedream 4.5'
);