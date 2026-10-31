import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bootstrapSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

/**
 * Bootstrap the initial admin user if the database is brand new.
 * If no profiles or user_roles exist yet, this automatically creates and
 * confirms the initial Super Admin account using the server-side admin client.
 */
export const bootstrapInitialAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => bootstrapSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if any profiles already exist
    const { count, error: countErr } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (countErr) {
      return { success: false, reason: "Database unavailable" };
    }

    // Only allow self-bootstrap if the system has 0 registered profiles
    if (count && count > 0) {
      return { success: false, reason: "Bootstrap already completed" };
    }

    const email = data.email.toLowerCase();

    // Look up or create the user in auth.users
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    let user = userList?.users?.find((u) => u.email?.toLowerCase() === email);

    if (!user) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: "Super Admin" },
      });
      if (createErr || !created.user) {
        return { success: false, reason: createErr?.message || "Could not create user" };
      }
      user = created.user;
    } else {
      // Auto-confirm and update password
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: data.password,
        email_confirm: true,
      });
    }

    // Ensure profile exists in public.profiles
    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      name: "Super Admin",
      email,
      college_id: null,
      dept_id: null,
    });

    // Ensure 'su' (Super Admin) role exists in public.user_roles
    await supabaseAdmin.from("user_roles").upsert({
      user_id: user.id,
      role: "su",
    }, { onConflict: "user_id,role" });

    return { success: true };
  });
