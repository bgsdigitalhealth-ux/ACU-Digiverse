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