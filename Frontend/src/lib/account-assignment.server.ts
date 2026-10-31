import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Display context only; authorization always uses protected role rows. */
export async function accountAssignment(admin: SupabaseClient<Database>, email: string) {
  const { data: profile } = await admin.from("profiles").select("id, name, college_id, dept_id").eq("email", email.toLowerCase()).maybeSingle();
  if (!profile) return {};
  const [{ data: roles }, { data: college }, { data: department }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", profile.id),
    profile.college_id ? admin.from("app_items").select("data").eq("collection", "colleges").eq("id", profile.college_id).maybeSingle() : Promise.resolve({ data: null }),
    profile.dept_id ? admin.from("app_items").select("data").eq("collection", "depts").eq("id", profile.dept_id).eq("college_id", profile.college_id ?? "").maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const nameOf = (value: unknown) => value && typeof value === "object" && "name" in value && typeof value.name === "string" ? value.name : undefined;
  return { name: profile.name, role: roles?.[0]?.role === "dept" ? "Department User" : undefined, college: nameOf(college?.data), department: nameOf(department?.data) };
}