const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchOptions {
  /** Cancels the request, typically when the worker shuts down. */
  signal: AbortSignal;
  /** Upper bound for the whole request, body included. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Fetch implementation, injectable for tests. */
  fetch?: typeof globalThis.fetch;
}

/** Raised when an upstream server answers with a non-2xx status. */
export class HttpError extends Error {
  readonly status: number;

  constructor(url: string, status: number, method = "GET") {
    super(`${method} ${url} responded with ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

async function request(
  url: string,
  method: "GET" | "HEAD",
  accept: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS, fetch: fetchImpl = globalThis.fetch }: FetchOptions,
): Promise<Response> {
  const response = await fetchImpl(url, {
    method,
    headers: { accept },
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  });

  if (!response.ok) {
    // Release the connection instead of waiting for the body to be garbage collected.
    await response.body?.cancel();
    throw new HttpError(url, response.status, method);
  }
  return response;
}

/**
 * Fetches a URL and returns its JSON body without assuming its shape:
 * callers are expected to validate it.
 */
export async function fetchJson(url: string, options: FetchOptions): Promise<unknown> {
  const response = await request(url, "GET", "application/json", options);
  return response.json();
}

/** Fetches a URL and returns its body as text, such as a CSV file. */
export async function fetchText(url: string, options: FetchOptions): Promise<string> {
  const response = await request(url, "GET", "text/plain, text/csv, */*", options);
  return response.text();
}

/**
 * Reads when a file was last modified with a HEAD request, without
 * downloading it. Resolves to null when the server does not say.
 */
export async function fetchLastModified(
  url: string,
  options: FetchOptions,
): Promise<string | null> {
  const response = await request(url, "HEAD", "*/*", options);
  return response.headers.get("last-modified");
}
