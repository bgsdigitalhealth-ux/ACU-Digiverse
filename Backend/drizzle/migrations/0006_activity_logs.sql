CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_name text NOT NULL DEFAULT '',
  submission_id text,
  action text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log own actions" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND length(action) <= 64 AND length(description) <= 1000);
CREATE POLICY "global admins read logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_global());
CREATE INDEX activity_logs_created_idx ON public.activity_logs (created_at DESC);