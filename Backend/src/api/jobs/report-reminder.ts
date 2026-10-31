import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { REMINDER_START_DATE } from "@/lib/report-reminder-policy";

const targetSchema = z.object({
  collegeId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  departmentId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  startDate: z.literal(REMINDER_START_DATE),
}).strict();

export const Route = createFileRoute("/api/public/jobs/report-reminder")({
  server: { handlers: { POST: async ({ request }) => {
    const authFailure = await authenticateCronRequest(request);
    if (authFailure) return authFailure;
    const parsed = targetSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid reminder target" }, { status: 400 });
    // The managed scheduler is authenticated before privileged imports or reads.
    const [{ supabaseAdmin }, { sendDepartmentReportReminder }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/report-reminders.server"),
    ]);
    try {
      const result = await sendDepartmentReportReminder(supabaseAdmin, parsed.data);
      return Response.json(result); // No names, email addresses, or report contents.
    } catch {
      return Response.json({ error: "Reminder could not be processed" }, { status: 503 });
    }
  } } },
});