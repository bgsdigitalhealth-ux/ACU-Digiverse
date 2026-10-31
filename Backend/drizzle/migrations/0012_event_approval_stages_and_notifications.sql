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