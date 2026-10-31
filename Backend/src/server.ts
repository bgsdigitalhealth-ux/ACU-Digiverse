import http from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT || 3001;

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname;

  try {
    // Health check
    if (pathname === "/health" || pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "ACU Digiverse Backend API", timestamp: new Date().toISOString() }));
      return;
    }

    // Cron Job: Report Reminder
    if (pathname === "/api/public/jobs/report-reminder" && req.method === "POST") {
      const { authenticateCronRequest } = await import("./integrations/supabase/cron-auth");
      const webReq = new Request(reqUrl.toString(), {
        method: req.method,
        headers: req.headers as any,
        body: JSON.stringify(await parseBody(req)),
      });
      const authFailure = await authenticateCronRequest(webReq);
      if (authFailure) {
        res.writeHead(authFailure.status, { "Content-Type": "text/plain" });
        res.end(await authFailure.text());
        return;
      }

      const { supabaseAdmin } = await import("./integrations/supabase/client.server");
      const { sendDepartmentReportReminder } = await import("./services/report-reminders.server");
      const body = await parseBody(req);
      const result = await sendDepartmentReportReminder(supabaseAdmin, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    // Admin Bootstrap endpoint
    if (pathname === "/api/admin/bootstrap" && req.method === "POST") {
      const body = await parseBody(req);
      const { supabaseAdmin } = await import("./integrations/supabase/client.server");
      const { count } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
      if (count && count > 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, reason: "Bootstrap already completed" }));
        return;
      }

      const email = String(body.email || "").toLowerCase();
      const password = String(body.password || "");
      if (!email || password.length < 6) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, reason: "Valid email and password (min 6 chars) required" }));
        return;
      }

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: "Super Admin" },
      });

      if (createErr || !created.user) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, reason: createErr?.message || "User creation failed" }));
        return;
      }

      await supabaseAdmin.from("profiles").upsert({
        id: created.user.id,
        name: "Super Admin",
        email,
        college_id: null,
        dept_id: null,
      });

      await supabaseAdmin.from("user_roles").upsert({
        user_id: created.user.id,
        role: "su",
      }, { onConflict: "user_id,role" });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Not Found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  } catch (error: any) {
    console.error("Backend server error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error?.message || "Internal server error" }));
  }
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`ACU Digiverse Backend API running on port ${PORT}`);
});

