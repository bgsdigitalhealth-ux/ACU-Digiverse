import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const startHandler = createStartHandler(defaultStreamHandler);

function toWebRequest(eventOrReq: any): Request {
  if (eventOrReq instanceof Request) return eventOrReq;
  if (eventOrReq?.web?.request instanceof Request) return eventOrReq.web.request;
  const nodeReq = eventOrReq?.node?.req || eventOrReq;
  const protocol = nodeReq.headers?.["x-forwarded-proto"] || "http";
  const host = nodeReq.headers?.["host"] || "localhost";
  const url = new URL(nodeReq.url || "/", `${protocol}://${host}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(nodeReq.headers || {})) {
    if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }
  const method = nodeReq.method || "GET";
  const body = (method === "GET" || method === "HEAD") ? undefined : nodeReq;
  const controller = new AbortController();
  nodeReq.on?.("close", () => controller.abort());
  return new Request(url, {
    method,
    headers,
    body: body as any,
    duplex: body ? "half" : undefined,
    signal: controller.signal,
  });
}

const handler = async (eventOrReq: any) => {
  const req = toWebRequest(eventOrReq);
  return startHandler(req);
};

(handler as any).fetch = (req: Request) => startHandler(toWebRequest(req));

export default handler;
