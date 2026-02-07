-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin');

-- Create enum for generation status
CREATE TYPE public.generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create enum for alert types
CREATE TYPE public.alert_type AS ENUM ('error_spike', 'slow_processing', 'high_usage', 'api_error');

-- Create enum for alert severity
CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');

-- Create user_roles table (following security best practices)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create generations table to track all image generations
CREATE TABLE public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_user_id TEXT, -- ID from WordPress
    shirt_id TEXT NOT NULL,
    status generation_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create daily_stats table for aggregated statistics
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

-- Create system_alerts table
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

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
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

-- Create function to check if user is any admin
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

-- RLS Policies for user_roles (only super_admins can manage roles)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for generations (admins can view all)
CREATE POLICY "Admins can view all generations"
ON public.generations
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert generations"
ON public.generations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anon can insert generations"
ON public.generations
FOR INSERT
TO anon
WITH CHECK (true);

-- RLS Policies for daily_stats (admins can view and manage)
CREATE POLICY "Admins can view daily stats"
ON public.daily_stats
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage daily stats"
ON public.daily_stats
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for system_alerts (admins can view and manage)
CREATE POLICY "Admins can view alerts"
ON public.system_alerts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage alerts"
ON public.system_alerts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX idx_generations_status ON public.generations(status);
CREATE INDEX idx_generations_external_user ON public.generations(external_user_id);
CREATE INDEX idx_daily_stats_date ON public.daily_stats(date DESC);
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts(resolved, created_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable realtime for generations and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;