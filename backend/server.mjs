import http from "node:http";

const port = Number(process.env.PORT || 8110);
const service = "bloom-minecraft-api";
const apiVersion = "v1";
const capabilities = Object.freeze({
  catalog: false,
  modrinth: false,
  curseforge: false,
  modpacks: false,
});

const sendJson = (response, status, body) => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  response.end(payload);
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  const pathname = url.pathname.startsWith("/minecraft/")
    ? url.pathname.slice("/minecraft".length)
    : url.pathname;
  if (request.method !== "GET") {
    response.setHeader("allow", "GET");
    return sendJson(response, 405, { error: "method_not_allowed" });
  }
  if (pathname === "/health") {
    return sendJson(response, 200, {
      service,
      status: "ok",
      apiVersion,
      capabilities,
      timestamp: new Date().toISOString(),
    });
  }
  if (pathname === "/v1/capabilities") {
    return sendJson(response, 200, { service, apiVersion, capabilities });
  }
  return sendJson(response, 404, { error: "not_found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`${service} listening on ${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
