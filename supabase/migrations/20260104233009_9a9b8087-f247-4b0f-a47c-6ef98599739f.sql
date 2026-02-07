-- Fix security definer view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS health_check_stats;

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