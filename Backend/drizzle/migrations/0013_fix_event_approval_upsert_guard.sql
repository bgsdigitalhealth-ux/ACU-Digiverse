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
