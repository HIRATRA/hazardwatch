const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchJsonOptions {
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

  constructor(url: string, status: number) {
    super(`GET ${url} responded with ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Fetches a URL and returns its JSON body without assuming its shape:
 * callers are expected to validate it.
 */
export async function fetchJson(
  url: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS, fetch: fetchImpl = globalThis.fetch }: FetchJsonOptions,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  });

  if (!response.ok) {
    // Release the connection instead of waiting for the body to be garbage collected.
    await response.body?.cancel();
    throw new HttpError(url, response.status);
  }

  return response.json();
}
