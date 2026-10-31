-- ==============================================================================
-- POSTGRESQL & SUPABASE COMPATIBILITY PREREQUISITES
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon');
$$;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid,
  aud varchar(255) DEFAULT 'authenticated',
  role varchar(255) DEFAULT 'authenticated',
  email varchar(255) UNIQUE,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz DEFAULT now(),
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  college_id text,
  dept_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles (separate table; text so custom roles defined in the app work)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.my_college()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT college_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_dept()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT dept_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_global()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'su') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.college_id IS NULL AND p.dept_id IS NULL
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role <> 'NONE')
  )
$$;

CREATE POLICY "profiles visible by scope" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_global() OR (college_id IS NOT NULL AND college_id = public.my_college()));

CREATE POLICY "roles visible by scope" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_global() OR EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.college_id IS NOT NULL AND p.college_id = public.my_college()
));

-- App records (colleges, depts, events, reports, zeros, event formats, submissions)
CREATE TABLE public.app_items (
  collection text NOT NULL,
  id text NOT NULL,
  college_id text,
  dept_id text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_items TO authenticated;
GRANT ALL ON public.app_items TO service_role;
ALTER TABLE public.app_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.in_my_scope(_college text, _dept text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_global() OR (
    _college IS NOT NULL AND _college = public.my_college()
    AND (public.my_dept() IS NULL OR _dept IS NULL OR _dept = public.my_dept())
  )
$$;

CREATE POLICY "read items in scope" ON public.app_items FOR SELECT TO authenticated
USING (collection IN ('colleges','depts') OR public.in_my_scope(college_id, dept_id));

CREATE POLICY "insert items in scope" ON public.app_items FOR INSERT TO authenticated
WITH CHECK (
  CASE WHEN collection = 'colleges' THEN public.is_global()
       WHEN collection = 'depts' THEN public.is_global() OR (college_id = public.my_college() AND public.my_dept() IS NULL)
       ELSE public.in_my_scope(college_id, dept_id) END
);

CREATE POLICY "update items in scope" ON public.app_items FOR UPDATE TO authenticated
USING (
  CASE WHEN collection = 'colleges' THEN public.is_global() OR id = public.my_college()
       WHEN collection = 'depts' THEN public.is_global() OR (college_id = public.my_college() AND public.my_dept() IS NULL)
       ELSE public.in_my_scope(college_id, dept_id) END
)
WITH CHECK (
  CASE WHEN collection = 'colleges' THEN public.is_global() OR id = public.my_college()
       WHEN collection = 'depts' THEN public.is_global() OR (college_id = public.my_college() AND public.my_dept() IS NULL)
       ELSE public.in_my_scope(college_id, dept_id) END
);

CREATE POLICY "delete items in scope" ON public.app_items FOR DELETE TO authenticated
USING (
  CASE WHEN collection = 'colleges' THEN public.is_global()
       WHEN collection = 'depts' THEN public.is_global() OR (college_id = public.my_college() AND public.my_dept() IS NULL)
       ELSE public.in_my_scope(college_id, dept_id) END
);

-- Global settings (report cycle, headings, roles & permissions, role names)
CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings editable by global admins" ON public.app_settings FOR UPDATE TO authenticated
USING (public.is_global()) WITH CHECK (public.is_global());
INSERT INTO public.app_settings (id, data) VALUES (1, '{}'::jsonb);

-- Private file storage policies (bucket "acu-files")
-- Create buckets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('acu-files', 'acu-files', false), ('ACUDigiverse', 'ACUDigiverse', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "acu files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('acu-files', 'ACUDigiverse'));
CREATE POLICY "acu files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('acu-files', 'ACUDigiverse'));
CREATE POLICY "acu files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('acu-files', 'ACUDigiverse'));

--- END MIGRATION: 0000_acu_core_schema.sql ---

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text), public.my_college(), public.my_dept(), public.is_global(), public.in_my_scope(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text), public.my_college(), public.my_dept(), public.is_global(), public.in_my_scope(text, text) TO authenticated;

--- END MIGRATION: 0001_revoke_anon_helper_exec.sql ---

UPDATE public.profiles SET dept_id = NULL WHERE dept_id = '';
UPDATE public.profiles SET college_id = NULL WHERE college_id = '';
CREATE OR REPLACE FUNCTION public.my_dept() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT NULLIF(dept_id,'') FROM public.profiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.my_college() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT NULLIF(college_id,'') FROM public.profiles WHERE id = auth.uid() $$;

--- END MIGRATION: 0002_normalize_blank_scope.sql ---

CREATE OR REPLACE FUNCTION public.list_public_event_resources()
RETURNS TABLE (id text, title text, department text, college text, event_date text, end_date text, event_time text, venue text, event_type text, mode text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT e.id, COALESCE(e.data->>'title','Untitled event'),
 COALESCE(d.data->>'name','Department not specified'), COALESCE(c.data->>'name','College not specified'),
 COALESCE(e.data->>'date',''), COALESCE(e.data->>'dateTo',''), COALESCE(e.data->>'time',''),
 COALESCE(e.data->>'venue',''), COALESCE(e.data->>'type',''), COALESCE(e.data->>'mode',''), e.data->>'status'
 FROM public.app_items e
 LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id
 LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id
 WHERE e.collection='events' AND e.data->>'status' IN ('APPROVED','COMPLETED')
 ORDER BY e.data->>'date' DESC, e.id
 LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_resources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_event_resources() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.list_public_event_resources() IS 'Public approved-event projection: exposes only event name, institutional names, scheduling, venue, type, mode and status. No staff identities, budgets, attachments or private report data.';

--- END MIGRATION: 0003_public_approved_event_resources.sql ---

CREATE OR REPLACE FUNCTION public.list_public_event_resources()
RETURNS TABLE (id text, title text, department text, college text, event_date text, end_date text, event_time text, venue text, event_type text, mode text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT e.id, COALESCE(e.data->>'title','Untitled event'),
 COALESCE(d.data->>'name','Department not specified'), COALESCE(c.data->>'name','College not specified'),
 COALESCE(e.data->>'date',''), COALESCE(e.data->>'dateTo',''), COALESCE(NULLIF(e.data->>'time',''), r.data->'data'->>'Time',''),
 COALESCE(e.data->>'venue',''), COALESCE(e.data->>'type',''), COALESCE(e.data->>'mode',''), e.data->>'status'
 FROM public.app_items e
 LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id
 LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id
 LEFT JOIN public.app_items r ON e.data->>'status'='COMPLETED' AND r.collection='recs' AND r.id=e.data->>'recId' AND r.dept_id=e.dept_id AND r.college_id=e.college_id
 WHERE e.collection='events' AND e.data->>'status' IN ('APPROVED','COMPLETED')
 ORDER BY e.data->>'date' DESC, e.id
 LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_resources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_event_resources() TO anon, authenticated, service_role;

--- END MIGRATION: 0004_include_verified_event_report_time.sql ---

CREATE OR REPLACE FUNCTION public.list_public_event_photos()
 RETURNS TABLE(id text, title text, department text, college text, event_date text, venue text, event_type text, photo_ids text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT e.id, COALESCE(e.data->>'title','Untitled event'),
  COALESCE(d.data->>'name',''), COALESCE(c.data->>'name',''),
  COALESCE(e.data->>'date',''), COALESCE(e.data->>'venue',''), COALESCE(e.data->>'type',''),
  ARRAY(SELECT f->>'id' FROM jsonb_each(COALESCE(r.data->'files','{}'::jsonb)) g(k,v), jsonb_array_elements(CASE WHEN jsonb_typeof(g.v)='array' THEN g.v ELSE '[]'::jsonb END) f
        WHERE f->>'type' LIKE 'image/%' AND COALESCE(f->>'id','')<>'' LIMIT 4)
 FROM public.app_items e
 JOIN public.app_items r ON r.collection='recs' AND r.id=e.data->>'recId' AND r.dept_id=e.dept_id AND r.college_id=e.college_id
 LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id
 LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id
 WHERE e.collection='events' AND e.data->>'status'='COMPLETED'
 ORDER BY e.data->>'date' DESC, e.id
 LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_photos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_event_photos() TO service_role;

--- END MIGRATION: 0005_migration.sql ---

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

--- END MIGRATION: 0006_activity_logs.sql ---

CREATE OR REPLACE FUNCTION public.cer_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  approver boolean;
  s_new text; s_old text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.collection NOT IN ('cerReports','cerDepts') THEN RETURN NEW; END IF;
  approver := public.is_global() OR public.has_role(auth.uid(),'dean')
    OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'cer_reviewer');
  IF NEW.collection = 'cerDepts' THEN
    IF NOT (public.is_global() OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'principal')) THEN
      RAISE EXCEPTION 'Only the college Principal can manage departments';
    END IF;
    RETURN NEW;
  END IF;
  s_new := NEW.data->>'status';
  s_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.data->>'status' ELSE NULL END;
  IF s_new IN ('Approved','Rejected','Revision Requested')
     AND (TG_OP = 'INSERT' OR s_old IS DISTINCT FROM s_new
          OR (OLD.data->'approvedSnapshot') IS DISTINCT FROM (NEW.data->'approvedSnapshot')
          OR (OLD.data->'decisions') IS DISTINCT FROM (NEW.data->'decisions'))
     AND NOT approver THEN
    RAISE EXCEPTION 'Only the Principal or a reviewer can make approval decisions';
  END IF;
  IF TG_OP = 'UPDATE' AND s_old = 'Approved'
     AND (OLD.data->'approvedSnapshot') IS DISTINCT FROM (NEW.data->'approvedSnapshot')
     AND NOT public.is_global() THEN
    RAISE EXCEPTION 'Approved reports are locked';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cer_guard_trg ON public.app_items;
CREATE TRIGGER cer_guard_trg BEFORE INSERT OR UPDATE ON public.app_items
FOR EACH ROW EXECUTE FUNCTION public.cer_guard();

--- END MIGRATION: 0007_cer_approval_guard.sql ---

CREATE POLICY "cer files college only read" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));
CREATE POLICY "cer files college only insert" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));
CREATE POLICY "cer files college only update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));
CREATE POLICY "cer files college only delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'acu-files' OR name NOT LIKE 'cer/%' OR public.in_my_scope(split_part(name,'/',2), NULL));

--- END MIGRATION: 0008_cer_files_isolation.sql ---

DROP TRIGGER IF EXISTS cer_guard_trg ON public.app_items;
DROP FUNCTION IF EXISTS public.cer_guard();
DROP POLICY IF EXISTS "cer files college only read" ON storage.objects;
DROP POLICY IF EXISTS "cer files college only insert" ON storage.objects;
DROP POLICY IF EXISTS "cer files college only update" ON storage.objects;
DROP POLICY IF EXISTS "cer files college only delete" ON storage.objects;

--- END MIGRATION: 0009_remove_cer_module.sql ---

ALTER TABLE public.app_settings ADD COLUMN event_workflow_enabled boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.app_settings.event_workflow_enabled IS 'Super Admin-controlled event workflow visibility. OFF retains data but blocks all event workflow reads and writes.';
CREATE OR REPLACE FUNCTION public.event_workflow_enabled() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT COALESCE((SELECT event_workflow_enabled FROM public.app_settings WHERE id=1),false) $$;
REVOKE ALL ON FUNCTION public.event_workflow_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_workflow_enabled() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_event_workflow_switch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.event_workflow_enabled IS DISTINCT FROM OLD.event_workflow_enabled AND NOT public.has_role(auth.uid(),'su') THEN RAISE EXCEPTION 'Only Super Admin can change event workflow visibility' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_event_workflow_switch() FROM PUBLIC;
CREATE TRIGGER protect_event_workflow_switch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.guard_event_workflow_switch();
CREATE OR REPLACE FUNCTION public.set_event_workflow_enabled(_enabled boolean) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ BEGIN IF _enabled IS NULL OR NOT public.has_role(auth.uid(),'su') THEN RAISE EXCEPTION 'Only Super Admin can change event workflow visibility' USING ERRCODE='42501'; END IF; UPDATE public.app_settings SET event_workflow_enabled=_enabled,updated_at=now() WHERE id=1; IF NOT FOUND THEN RAISE EXCEPTION 'Workflow settings unavailable'; END IF; RETURN _enabled; END $$;
REVOKE ALL ON FUNCTION public.set_event_workflow_enabled(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_event_workflow_enabled(boolean) TO authenticated;
CREATE POLICY "event workflow visibility gate" ON public.app_items AS RESTRICTIVE FOR ALL TO authenticated USING (public.event_workflow_enabled() OR NOT (collection='events' OR (collection IN ('recs','zeros') AND (data->>'head'='evo' OR COALESCE(data->>'evId','')<>'')))) WITH CHECK (public.event_workflow_enabled() OR NOT (collection='events' OR (collection IN ('recs','zeros') AND (data->>'head'='evo' OR COALESCE(data->>'evId','')<>''))));
CREATE OR REPLACE FUNCTION public.list_public_event_resources()
RETURNS TABLE (id text,title text,department text,college text,event_date text,end_date text,event_time text,venue text,event_type text,mode text,status text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT e.id,COALESCE(e.data->>'title','Untitled event'),COALESCE(d.data->>'name','Department not specified'),COALESCE(c.data->>'name','College not specified'),COALESCE(e.data->>'date',''),COALESCE(e.data->>'dateTo',''),COALESCE(NULLIF(e.data->>'time',''),r.data->'data'->>'Time',''),COALESCE(e.data->>'venue',''),COALESCE(e.data->>'type',''),COALESCE(e.data->>'mode',''),e.data->>'status'
FROM public.app_items e LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id LEFT JOIN public.app_items r ON e.data->>'status'='COMPLETED' AND r.collection='recs' AND r.id=e.data->>'recId' AND r.dept_id=e.dept_id AND r.college_id=e.college_id WHERE public.event_workflow_enabled() AND e.collection='events' AND e.data->>'status' IN ('APPROVED','COMPLETED') ORDER BY e.data->>'date' DESC,e.id LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_resources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_event_resources() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.list_public_event_photos() RETURNS TABLE(id text,title text,department text,college text,event_date text,venue text,event_type text,photo_ids text[]) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT e.id,COALESCE(e.data->>'title','Untitled event'),COALESCE(d.data->>'name',''),COALESCE(c.data->>'name',''),COALESCE(e.data->>'date',''),COALESCE(e.data->>'venue',''),COALESCE(e.data->>'type',''),ARRAY(SELECT f->>'id' FROM jsonb_each(COALESCE(r.data->'files','{}'::jsonb))g(k,v),jsonb_array_elements(CASE WHEN jsonb_typeof(g.v)='array' THEN g.v ELSE '[]'::jsonb END)f WHERE f->>'type' LIKE 'image/%' AND COALESCE(f->>'id','')<>'' LIMIT 4) FROM public.app_items e JOIN public.app_items r ON r.collection='recs' AND r.id=e.data->>'recId' AND r.dept_id=e.dept_id AND r.college_id=e.college_id LEFT JOIN public.app_items d ON d.collection='depts' AND d.id=e.dept_id LEFT JOIN public.app_items c ON c.collection='colleges' AND c.id=e.college_id WHERE public.event_workflow_enabled() AND e.collection='events' AND e.data->>'status'='COMPLETED' ORDER BY e.data->>'date' DESC,e.id LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.list_public_event_photos() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_event_photos() TO service_role;

--- END MIGRATION: 0010_super_admin_event_workflow_switch.sql ---

ALTER POLICY "event workflow visibility gate" ON public.app_items USING (public.event_workflow_enabled() OR NOT (collection='events' OR (collection IN ('recs','zeros') AND (COALESCE(data->>'head','')='evo' OR COALESCE(data->>'evId','')<>'')))) WITH CHECK (public.event_workflow_enabled() OR NOT (collection='events' OR (collection IN ('recs','zeros') AND (COALESCE(data->>'head','')='evo' OR COALESCE(data->>'evId','')<>''))));

--- END MIGRATION: 0011_event_visibility_null_safe_records.sql ---

-- Two-level event approval: college Dean stage then University Admin final approval,
-- plus in-app notifications delivered only to the originating college.

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL,
  event_id text NOT NULL,
  event_num text NOT NULL DEFAULT '',
  event_title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_by uuid[] NOT NULL DEFAULT '{}'::uuid[]
);
COMMENT ON TABLE public.notifications IS 'In-app approval notices. One row per final approval, visible only to the originating college (or a global administrator).';
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications visible to own college" ON public.notifications FOR SELECT TO authenticated USING (public.is_global() OR college_id = public.my_college());
CREATE POLICY "notifications marked read by own college" ON public.notifications FOR UPDATE TO authenticated USING (public.is_global() OR college_id = public.my_college()) WITH CHECK (public.is_global() OR college_id = public.my_college());
CREATE POLICY "notifications removed by super admin" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'su'));

-- Approval notices are written by the system only; college users may mark them read and nothing else.
CREATE OR REPLACE FUNCTION public.guard_notification_columns() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.college_id IS DISTINCT FROM OLD.college_id
      OR NEW.event_id IS DISTINCT FROM OLD.event_id
      OR NEW.event_num IS DISTINCT FROM OLD.event_num
      OR NEW.event_title IS DISTINCT FROM OLD.event_title
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.message IS DISTINCT FROM OLD.message
      OR NEW.created_at IS DISTINCT FROM OLD.created_at)
     AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'su')) THEN
    RAISE EXCEPTION 'Approval notices cannot be edited' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_notification_columns() FROM PUBLIC;
CREATE TRIGGER protect_notification_columns BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_columns();

-- Server-side approval order: nobody may skip the college Dean stage, and each Dean decides only their own college.
CREATE OR REPLACE FUNCTION public.guard_event_approval() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_status text := COALESCE(OLD.data->>'status', '');
  new_status text := COALESCE(NEW.data->>'status', '');
  caller uuid := auth.uid();
  is_su boolean := caller IS NOT NULL AND public.has_role(caller, 'su');
  is_dean_here boolean := caller IS NOT NULL AND public.has_role(caller, 'dean')
    AND NEW.college_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller AND p.college_id = NEW.college_id);
  is_univ boolean := caller IS NOT NULL AND public.is_global();
  in_scope boolean := caller IS NOT NULL AND public.in_my_scope(NEW.college_id, NEW.dept_id);
BEGIN
  IF new_status NOT IN ('PENDING','DAPPROVED','RETURNED','REJECTED','APPROVED','SUBMITTED','CRETURNED','COMPLETED') THEN
    RAISE EXCEPTION 'Unknown event approval status' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT is_univ AND new_status <> 'PENDING' THEN
      RAISE EXCEPTION 'A new event must be submitted for college Dean approval' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF new_status = old_status THEN RETURN NEW; END IF;
  IF old_status = 'PENDING' AND new_status IN ('DAPPROVED','RETURNED','REJECTED') THEN
    IF NOT (is_dean_here OR is_su) THEN
      RAISE EXCEPTION 'Only the Dean / Principal of the originating college can decide this event' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'DAPPROVED' AND new_status IN ('APPROVED','RETURNED','REJECTED') THEN
    IF NOT is_univ THEN
      RAISE EXCEPTION 'Only a University Admin can give final approval' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'RETURNED' AND new_status = 'PENDING' THEN
    IF NOT in_scope THEN
      RAISE EXCEPTION 'Only the originating department can resubmit this event' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status IN ('APPROVED','CRETURNED') AND new_status = 'SUBMITTED' THEN
    IF NOT in_scope THEN
      RAISE EXCEPTION 'Only the originating department can file the completion report' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'SUBMITTED' AND new_status IN ('COMPLETED','CRETURNED') THEN
    IF NOT (in_scope OR is_univ) THEN
      RAISE EXCEPTION 'Verification is limited to the originating college and the university' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'REJECTED' THEN
    IF NOT is_su THEN
      RAISE EXCEPTION 'A rejected event cannot be reopened' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not a valid approval step: % to %', old_status, new_status USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_event_approval() FROM PUBLIC;
CREATE TRIGGER protect_event_approval BEFORE INSERT OR UPDATE ON public.app_items
  FOR EACH ROW WHEN (NEW.collection = 'events') EXECUTE FUNCTION public.guard_event_approval();

-- Final approval notifies only the originating college.
CREATE OR REPLACE FUNCTION public.notify_event_final_approval() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.college_id IS NOT NULL THEN
    INSERT INTO public.notifications (college_id, event_id, event_num, event_title, status, message)
    VALUES (NEW.college_id, NEW.id, COALESCE(NEW.data->>'num', ''), COALESCE(NEW.data->>'title', 'Untitled event'),
      'Finally Approved', 'Your event has received final approval from the University Admin.');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_event_final_approval() FROM PUBLIC;
CREATE TRIGGER notify_final_approval AFTER UPDATE ON public.app_items
  FOR EACH ROW WHEN (NEW.collection = 'events' AND NEW.data->>'status' = 'APPROVED' AND OLD.data->>'status' <> 'APPROVED')
  EXECUTE FUNCTION public.notify_event_final_approval();

--- END MIGRATION: 0012_event_approval_stages_and_notifications.sql ---

-- Fix: College Dean approvals and completion reports were refused; departments could self-verify.
-- The workspace saves events with upsert (INSERT ... ON CONFLICT DO UPDATE). Postgres runs the
-- BEFORE INSERT trigger for every upserted row, so an existing event saved with any status other
-- than PENDING by a non-university user was rejected as if it were a new event. Existing rows are
-- now left to the BEFORE UPDATE check, which enforces the approval order using the old status.
-- Also: a department can no longer verify its own completion report; verification needs
-- college-level staff of the event's college (Dean / College Admin) or a University Admin.

CREATE OR REPLACE FUNCTION public.guard_event_approval() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_status text := COALESCE(OLD.data->>'status', '');
  new_status text := COALESCE(NEW.data->>'status', '');
  caller uuid := auth.uid();
  is_su boolean := caller IS NOT NULL AND public.has_role(caller, 'su');
  is_dean_here boolean := caller IS NOT NULL AND public.has_role(caller, 'dean')
    AND NEW.college_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller AND p.college_id = NEW.college_id);
  is_univ boolean := caller IS NOT NULL AND public.is_global();
  in_scope boolean := caller IS NOT NULL AND public.in_my_scope(NEW.college_id, NEW.dept_id);
  is_college_staff boolean := caller IS NOT NULL AND NEW.college_id IS NOT NULL
    AND NOT public.has_role(caller, 'dept')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller AND p.college_id = NEW.college_id AND p.dept_id IS NULL);
BEGIN
  IF new_status NOT IN ('PENDING','DAPPROVED','RETURNED','REJECTED','APPROVED','SUBMITTED','CRETURNED','COMPLETED') THEN
    RAISE EXCEPTION 'Unknown event approval status' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- The workspace saves with upsert, which runs this INSERT check even for an event that
    -- already exists. Leave existing rows to the UPDATE check, which knows the old status.
    IF EXISTS (SELECT 1 FROM public.app_items a WHERE a.collection = NEW.collection AND a.id = NEW.id) THEN
      RETURN NEW;
    END IF;
    IF NOT is_univ AND new_status <> 'PENDING' THEN
      RAISE EXCEPTION 'A new event must be submitted for college Dean approval' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF new_status = old_status THEN RETURN NEW; END IF;
  IF old_status = 'PENDING' AND new_status IN ('DAPPROVED','RETURNED','REJECTED') THEN
    IF NOT (is_dean_here OR is_su) THEN
      RAISE EXCEPTION 'Only the Dean / Principal of the originating college can decide this event' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'DAPPROVED' AND new_status IN ('APPROVED','RETURNED','REJECTED') THEN
    IF NOT is_univ THEN
      RAISE EXCEPTION 'Only a University Admin can give final approval' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'RETURNED' AND new_status = 'PENDING' THEN
    IF NOT in_scope THEN
      RAISE EXCEPTION 'Only the originating department can resubmit this event' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status IN ('APPROVED','CRETURNED') AND new_status = 'SUBMITTED' THEN
    IF NOT in_scope THEN
      RAISE EXCEPTION 'Only the originating department can file the completion report' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'SUBMITTED' AND new_status IN ('COMPLETED','CRETURNED') THEN
    IF NOT (is_college_staff OR is_univ) THEN
      RAISE EXCEPTION 'Verification is limited to the originating college and the university' USING ERRCODE = '42501';
    END IF;
  ELSIF old_status = 'REJECTED' THEN
    IF NOT is_su THEN
      RAISE EXCEPTION 'A rejected event cannot be reopened' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not a valid approval step: % to %', old_status, new_status USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_event_approval() FROM PUBLIC;

--- END MIGRATION: 0013_fix_event_approval_upsert_guard.sql ---

DROP POLICY "profiles visible by scope" ON public.profiles;
CREATE POLICY "profiles visible by scope" ON public.profiles FOR SELECT TO authenticated
USING (
  (id = auth.uid())
  OR (NOT public.has_role(id, 'su') AND (public.is_global() OR (college_id IS NOT NULL AND college_id = public.my_college())))
  OR public.has_role(auth.uid(), 'su')
);

DROP POLICY "roles visible by scope" ON public.user_roles;
CREATE POLICY "roles visible by scope" ON public.user_roles FOR SELECT TO authenticated
USING (
  (user_id = auth.uid())
  OR (role <> 'su' AND (public.is_global() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.college_id IS NOT NULL AND p.college_id = public.my_college())))
  OR public.has_role(auth.uid(), 'su')
);

--- END MIGRATION: 0014_hide_super_admin_from_non_su.sql ---

CREATE TABLE public.integration_settings (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

--- END MIGRATION: 0015_integration_settings.sql ---

DROP POLICY "event workflow visibility gate" ON public.app_items;
CREATE POLICY "event workflow visibility gate" ON public.app_items AS RESTRICTIVE FOR ALL
USING (event_workflow_enabled() OR NOT (collection = 'events' OR (collection = ANY (ARRAY['recs','zeros']) AND COALESCE(data->>'evId','') <> '')))
WITH CHECK (event_workflow_enabled() OR NOT (collection = 'events' OR (collection = ANY (ARRAY['recs','zeros']) AND COALESCE(data->>'evId','') <> '')));

--- END MIGRATION: 0016_migration.sql ---

CREATE OR REPLACE FUNCTION public.is_global()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'su') OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND NULLIF(p.college_id, '') IS NULL AND NULLIF(p.dept_id, '') IS NULL
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role NOT IN ('NONE', 'dept', 'ca', 'dean'))
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_department_account_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  account_id uuid;
  college_scope text;
  department_scope text;
  assigned_count integer;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    account_id := NEW.id;
    college_scope := NULLIF(NEW.college_id, '');
    department_scope := NULLIF(NEW.dept_id, '');
    IF NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = account_id AND r.role = 'dept') THEN RETURN NEW; END IF;
  ELSE
    IF NEW.role <> 'dept' THEN RETURN NEW; END IF;
    account_id := NEW.user_id;
    SELECT NULLIF(p.college_id, ''), NULLIF(p.dept_id, '') INTO college_scope, department_scope FROM public.profiles p WHERE p.id = account_id;
  END IF;
  IF college_scope IS NULL AND department_scope IS NULL THEN RETURN NEW; END IF;
  IF college_scope IS NULL OR department_scope IS NULL THEN
    RAISE EXCEPTION 'Select both college and department for this Department User' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(college_scope || ':' || department_scope, 0));
  IF NOT EXISTS (SELECT 1 FROM public.app_items d WHERE d.collection = 'depts' AND d.id = department_scope AND d.college_id = college_scope) THEN
    RAISE EXCEPTION 'The department does not belong to the selected college' USING ERRCODE = '23514';
  END IF;
  SELECT count(*) INTO assigned_count FROM public.profiles p
    WHERE p.id <> account_id AND p.college_id = college_scope AND p.dept_id = department_scope
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'dept');
  IF assigned_count >= 2 THEN
    RAISE EXCEPTION 'This department already has two Department Users' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_department_account_capacity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_department_account_capacity() TO service_role;
CREATE TRIGGER enforce_department_capacity_on_profile BEFORE INSERT OR UPDATE OF college_id, dept_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_department_account_capacity();
CREATE TRIGGER enforce_department_capacity_on_role BEFORE INSERT OR UPDATE OF user_id, role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_department_account_capacity();

--- END MIGRATION: 0017_enforce_department_account_scope_capacity.sql ---

ALTER TABLE public.app_settings DISABLE TRIGGER protect_event_workflow_switch;
UPDATE public.app_settings SET event_workflow_enabled = true WHERE id = 1;
ALTER TABLE public.app_settings ENABLE TRIGGER protect_event_workflow_switch;
ALTER TABLE public.app_settings ALTER COLUMN event_workflow_enabled SET DEFAULT true;
CREATE OR REPLACE FUNCTION public.guard_event_workflow_switch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.event_workflow_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'Event workflow must stay ON' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;

--- END MIGRATION: 0018_event_workflow_always_on.sql ---

