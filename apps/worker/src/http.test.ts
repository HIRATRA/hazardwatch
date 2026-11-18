import { describe, expect, it, vi } from "vitest";

import { fetchJson, fetchLastModified, fetchText, HttpError } from "./http.js";

const url = "https://feeds.example.test/events.json";
const neverAborted = () => new AbortController().signal;

/** A fetch that only settles when its request is aborted. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(init.signal?.reason as Error);
    });
  });

describe("fetchJson", () => {
  it("returns the parsed body of a successful response", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json({ features: [] })),
    );

    await expect(fetchJson(url, { signal: neverAborted(), fetch })).resolves.toEqual({
      features: [],
    });
    const [requestedUrl, init] = fetch.mock.calls[0] ?? [];
    expect(requestedUrl).toBe(url);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws an HttpError carrying the status of a failed response", async () => {
    const fetch = () => Promise.resolve(new Response("unavailable", { status: 503 }));

    const error = await fetchJson(url, { signal: neverAborted(), fetch }).catch(
      (error: unknown) => error,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503, message: `GET ${url} responded with 503` });
  });

  it("gives up once the timeout elapses", async () => {
    await expect(
      fetchJson(url, { signal: neverAborted(), timeoutMs: 10, fetch: hangingFetch }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("stops when the caller aborts", async () => {
    const controller = new AbortController();
    const request = fetchJson(url, { signal: controller.signal, fetch: hangingFetch });

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("fetchText", () => {
  it("returns the body as text", async () => {
    const fetch = () => Promise.resolve(new Response("latitude,longitude\n1,2\n"));

    await expect(fetchText(url, { signal: neverAborted(), fetch })).resolves.toBe(
      "latitude,longitude\n1,2\n",
    );
  });
});

describe("fetchLastModified", () => {
  it("reads the Last-Modified header of a HEAD request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(null, { headers: { "last-modified": "Wed, 18 Nov 2026 11:40:18 GMT" } }),
      ),
    );

    await expect(fetchLastModified(url, { signal: neverAborted(), fetch })).resolves.toBe(
      "Wed, 18 Nov 2026 11:40:18 GMT",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("HEAD");
  });

  it("resolves to null when the server does not say", async () => {
    const fetch = () => Promise.resolve(new Response(null));

    await expect(fetchLastModified(url, { signal: neverAborted(), fetch })).resolves.toBeNull();
  });

  it("names the method in errors", async () => {
    const fetch = () => Promise.resolve(new Response(null, { status: 404 }));

    await expect(fetchLastModified(url, { signal: neverAborted(), fetch })).rejects.toMatchObject({
      message: `HEAD ${url} responded with 404`,
    });
  });
});
