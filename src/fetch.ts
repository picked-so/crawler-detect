import { detectAiBot } from "./bots.js";
import { cdnCountry, clientIp, reportHits, type ReportOptions } from "./report.js";

type WaitUntil = { waitUntil(promise: Promise<unknown>): void };

/**
 * For any server built on the Fetch API: Cloudflare Workers, Hono, Bun, Deno, Remix, SvelteKit,
 * Astro. Pass the request, the response you're about to return (for its status) and, where the
 * runtime has one, the context whose `waitUntil` keeps the send alive after the response.
 *
 *   export default {
 *     async fetch(request, env, ctx) {
 *       const response = await handle(request);
 *       trackAiCrawler(request, response, ctx, { endpoint: env.PICKED_INGEST_URL });
 *       return response;
 *     },
 *   };
 *
 * Returns the send's promise too, for runtimes without `waitUntil` that can await it.
 */
export function trackAiCrawler(
  request: Request,
  response?: Response | null,
  context?: WaitUntil | null,
  options?: ReportOptions,
): Promise<boolean> {
  const userAgent = request.headers.get("user-agent");
  if (!userAgent || !detectAiBot(userAgent)) return Promise.resolve(false);
  const url = new URL(request.url);
  const sent = reportHits(
    [
      {
        host: url.host,
        path: url.pathname,
        userAgent,
        ip: clientIp(request.headers),
        country: cdnCountry(request.headers),
        status: response?.status ?? null,
      },
    ],
    options,
  );
  context?.waitUntil(sent);
  return sent;
}
