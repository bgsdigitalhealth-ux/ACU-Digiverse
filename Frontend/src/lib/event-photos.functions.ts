import { createServerFn } from "@tanstack/react-start";

export type PublicEventPhoto = {
  id: string;
  title: string;
  department: string;
  college: string;
  date: string;
  venue: string;
  type: string;
  image: string;
};

// Public: returns only completed events that have uploaded photos, with short-lived signed image URLs.
export const listPublicEventPhotos = createServerFn({ method: "GET" }).handler(async (): Promise<PublicEventPhoto[]> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any).rpc("list_public_event_photos");
    if (error || !data) return [];
    const out: PublicEventPhoto[] = [];
    for (const row of data as any[]) {
      const pid = (row.photo_ids || [])[0];
      if (!pid) continue;
      const { data: signed } = await supabaseAdmin.storage.from("acu-files").createSignedUrl(pid, 60 * 60);
      if (!signed?.signedUrl) continue;
      out.push({ id: row.id, title: row.title, department: row.department, college: row.college, date: row.event_date, venue: row.venue, type: row.event_type, image: signed.signedUrl });
    }
    return out;
  } catch {
    return [];
  }
});
