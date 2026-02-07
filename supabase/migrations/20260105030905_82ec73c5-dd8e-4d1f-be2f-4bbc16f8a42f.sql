-- Allow admins to delete health checks
CREATE POLICY "Admins can delete health checks"
ON public.health_checks
FOR DELETE
USING (is_admin(auth.uid()));