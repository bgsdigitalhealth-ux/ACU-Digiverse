import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Validates a college portal link: URL slug + signed-in user's college + database college record.
 * Never trusts the URL alone.
 */
export const checkCollegePortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]{1,32}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cols } = await supabaseAdmin.from("app_items").select("id, data").eq("collection", "colleges");
    const college = (cols || []).find(
      (c: any) => String(c.data?.code || "").toLowerCase() === data.slug,
    );
    if (!college) return { status: "not_found" as const };
    const name = String((college.data as any)?.name || "");

    const [{ data: prof }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("college_id, dept_id").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    const role = roles?.[0]?.role ?? "NONE";
    // Only Super Admin or users assigned to this exact college (with an active role) may open its link.
    if (role === "su" || (role !== "NONE" && prof?.college_id && prof.college_id === college.id)) {
      return { status: "ok" as const, name, collegeId: college.id };
    }
    return { status: "denied" as const, name };
  });
