```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin');
CREATE TYPE public.generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.alert_type AS ENUM ('error_spike', 'slow_processing', 'high_usage', 'api_error');
CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE TABLE public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_user_id TEXT,
    shirt_id TEXT NOT NULL,
    status generation_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    total_generations INTEGER NOT NULL DEFAULT 0,
    successful_generations INTEGER NOT NULL DEFAULT 0,
    failed_generations INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    avg_processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type alert_type NOT NULL,
    message TEXT NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'info',
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.health_checks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage')),
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'generation',
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, action)
);

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

CREATE TABLE public.consent_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    consent_type TEXT NOT NULL DEFAULT 'image_upload',
    ip_address TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    consent_text TEXT NOT NULL
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.cleanup_old_health_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM health_checks
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

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

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE VIEW health_check_stats
WITH (security_invoker = on) AS
SELECT
  service_id,
  service_name,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE status = 'operational') as operational_checks,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'operational')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
    2
  ) as uptime_percentage,
  AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
  MAX(created_at) as last_check
FROM health_checks
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY service_id, service_name;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view all generations" ON public.generations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role can insert generations" ON public.generations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can insert generations" ON public.generations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service role can update generations" ON public.generations FOR UPDATE USING (true);

CREATE POLICY "Admins can view daily stats" ON public.daily_stats FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage daily stats" ON public.daily_stats FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view alerts" ON public.system_alerts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage alerts" ON public.system_alerts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role can insert alerts" ON public.system_alerts FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view health checks" ON public.health_checks FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete health checks" ON public.health_checks FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Service role can insert health checks" ON public.health_checks FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can manage health checks" ON public.health_checks FOR ALL USING (true);

CREATE POLICY "Admins can view settings" ON public.system_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert settings" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role can read settings" ON public.system_settings FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can manage rate limits" ON public.rate_limits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view rate limits" ON public.rate_limits FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage queue" ON public.generation_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can insert queue entries" ON public.generation_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own queue entries" ON public.generation_queue FOR SELECT USING (true);
CREATE POLICY "Admins can view all queue entries" ON public.generation_queue FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can log consent" ON public.consent_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view consent logs" ON public.consent_logs FOR SELECT USING (public.is_admin(auth.uid()));

CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX idx_generations_status ON public.generations(status);
CREATE INDEX idx_generations_external_user ON public.generations(external_user_id);
CREATE INDEX idx_generations_status_created ON public.generations(status, created_at DESC);
CREATE INDEX idx_daily_stats_date ON public.daily_stats(date DESC);
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts(resolved, created_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_health_checks_service_created ON public.health_checks(service_id, created_at DESC);
CREATE INDEX idx_health_checks_created_at ON public.health_checks(created_at DESC);
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action);
CREATE INDEX idx_queue_status_created ON public.generation_queue(status, created_at);
CREATE INDEX idx_queue_user ON public.generation_queue(user_id, created_at DESC);
CREATE INDEX idx_queue_replicate_id ON public.generation_queue(replicate_prediction_id) WHERE replicate_prediction_id IS NOT NULL;
CREATE INDEX idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX idx_consent_logs_accepted_at ON public.consent_logs(accepted_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('tryon-temp', 'tryon-temp', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('tryon-assets', 'tryon-assets', true, 10485760) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for tryon-temp" ON storage.objects FOR SELECT USING (bucket_id = 'tryon-temp');
CREATE POLICY "Service role upload for tryon-temp" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tryon-temp');
CREATE POLICY "Service role delete for tryon-temp" ON storage.objects FOR DELETE USING (bucket_id = 'tryon-temp');
CREATE POLICY "Public read access for tryon assets" ON storage.objects FOR SELECT USING (bucket_id = 'tryon-assets');
CREATE POLICY "Allow uploads to tryon-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tryon-assets');
CREATE POLICY "Allow updates to tryon-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'tryon-assets');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_queue;

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

COMMENT ON TABLE public.generation_queue IS 'Fila de gerações usando Replicate API';
COMMENT ON TABLE public.generations IS 'Histórico de todas as gerações de imagens';
COMMENT ON TABLE public.system_settings IS 'Configurações do sistema (prompt, etc)';
```
