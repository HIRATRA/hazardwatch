import { afterEach, describe, expect, it } from "vitest";

import { startHealthServer, type HealthServer } from "./health.js";

let server: HealthServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function request(path: string, method = "GET") {
  server ??= await startHealthServer(0);
  return fetch(`http://127.0.0.1:${server.port}${path}`, { method });
}

describe("startHealthServer", () => {
  it("answers health checks", async () => {
    const response = await request("/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ status: "ok", uptimeSeconds: 0 });
  });

  it("answers on the root path and to HEAD requests, which uptime monitors use", async () => {
    expect((await request("/")).status).toBe(200);
    expect((await request("/health", "HEAD")).status).toBe(200);
  });

  it("ignores query strings", async () => {
    expect((await request("/health?source=monitor")).status).toBe(200);
  });

  it("answers 404 anywhere else", async () => {
    expect((await request("/admin")).status).toBe(404);
    expect((await request("/health", "POST")).status).toBe(404);
  });

  it("stops listening once closed", async () => {
    server = await startHealthServer(0);
    const { port } = server;

    await server.close();
    server = undefined;

    await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
  });
});
