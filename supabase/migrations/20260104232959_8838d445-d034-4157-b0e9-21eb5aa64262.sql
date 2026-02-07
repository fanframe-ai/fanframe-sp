-- Create health_checks table to store monitoring history
CREATE TABLE public.health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage')),
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_health_checks_service_created ON health_checks(service_id, created_at DESC);
CREATE INDEX idx_health_checks_created_at ON health_checks(created_at DESC);

-- Enable RLS
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- Allow admins to view health checks
CREATE POLICY "Admins can view health checks"
ON public.health_checks
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow service role to insert health checks (for edge function)
CREATE POLICY "Service role can insert health checks"
ON public.health_checks
FOR INSERT
WITH CHECK (true);

-- Enable pg_cron and pg_net extensions for scheduled health checks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to clean up old health checks (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
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

-- Create uptime stats view for easier querying
CREATE OR REPLACE VIEW health_check_stats AS
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