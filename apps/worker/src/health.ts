import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** Paths that answer health checks. Any other path answers 404. */
const HEALTH_PATHS = new Set(["/", "/health"]);

export interface HealthServer {
  /** Port the server listens on, useful when it was started on port 0. */
  port: number;
  close(): Promise<void>;
}

/**
 * Answers health checks over HTTP, for hosts that run the worker as a web
 * service and expect it to listen on a port. Answering at all is the
 * signal: the process is up and its event loop is not stuck.
 */
export async function startHealthServer(port: number): Promise<HealthServer> {
  const startedAt = Date.now();
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://worker").pathname;
    const isCheck = request.method === "GET" || request.method === "HEAD";
    if (!isCheck || !HEALTH_PATHS.has(path)) {
      response.writeHead(404).end();
      return;
    }
    const body = JSON.stringify({
      status: "ok",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(request.method === "HEAD" ? undefined : body);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => resolve());
  });

  return {
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
