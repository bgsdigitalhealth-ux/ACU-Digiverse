UPDATE public.profiles SET dept_id = NULL WHERE dept_id = '';
UPDATE public.profiles SET college_id = NULL WHERE college_id = '';
CREATE OR REPLACE FUNCTION public.my_dept() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT NULLIF(dept_id,'') FROM public.profiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.my_college() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT NULLIF(college_id,'') FROM public.profiles WHERE id = auth.uid() $$;