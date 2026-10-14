export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export const USER_AGENT =
  "airplane-guessing-game-data-job/0.1 (https://github.com/joojdev; hobby project, manual runs)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with polite headers and exponential-backoff retry on 429/5xx/network errors. */
export async function politeFetch(
  url: string,
  init: RequestInit = {},
  { retries = 4, baseDelayMs = 1500, fetcher = fetch as Fetcher } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(60_000),
        ...init,
        headers: { "User-Agent": USER_AGENT, ...(init.headers as Record<string, string>) },
      });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("HTTP 4")) throw error;
      lastError = error;
    }
    if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
