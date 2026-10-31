-- Profiles
CREATE TABLE public.profiles (
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
CREATE POLICY "acu files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'acu-files');
CREATE POLICY "acu files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'acu-files');
CREATE POLICY "acu files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'acu-files');
