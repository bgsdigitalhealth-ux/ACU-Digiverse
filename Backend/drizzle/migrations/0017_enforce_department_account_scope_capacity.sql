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