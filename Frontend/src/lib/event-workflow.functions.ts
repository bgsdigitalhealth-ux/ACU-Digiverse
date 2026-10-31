import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_URL = "https://fmlitadbywzhfmqpescp.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbGl0YWRieXd6aGZtcXBlc2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMjg4NDEsImV4cCI6MjEwODkwNDg0MX0.yPSnanKnvC3EqzclxSruXHG9a7A2udYb-a8sco3z_6A";

export const getPublicEventWorkflow = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || FALLBACK_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || FALLBACK_KEY;
  try {
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data, error } = await client.rpc("event_workflow_enabled");
    if (error) {
      console.warn("[event-workflow] rpc returned error:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.warn("[event-workflow] error fetching workflow status:", err);
    return false;
  }
});
