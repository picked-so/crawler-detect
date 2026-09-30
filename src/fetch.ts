import { detectAiBot } from "./bots.js";
import { detectAiReferral, isPagePath, refererOrigin } from "./referrers.js";
import { cdnCountry, clientIp, reportHits, type CrawlerHit, type ReportOptions } from "./report.js";

type WaitUntil = { waitUntil(promise: Promise<unknown>): void };

/**
 * For any server built on the Fetch API: Cloudflare Workers, Hono, Bun, Deno, Remix, SvelteKit,
 * Astro. AI bot requests, and page views from people who came from an AI answer, are sent.
 * Pass the request, the response you're about to return (for its status) and, where the
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
  if (!userAgent) return Promise.resolve(false);
  const url = new URL(request.url);
  let hit: CrawlerHit | null = null;
  if (detectAiBot(userAgent)) {
    hit = {
      host: url.host,
      path: url.pathname,
      userAgent,
      ip: clientIp(request.headers),
      country: cdnCountry(request.headers),
      status: response?.status ?? null,
    };
  } else if (
    options?.referrals !== false &&
    request.method === "GET" &&
    isPagePath(url.pathname) &&
    detectAiReferral(request.headers.get("referer"), url.search)
  ) {
    hit = {
      host: url.host,
      path: url.pathname + url.search,
      userAgent,
      referer: refererOrigin(request.headers.get("referer")),
      status: response?.status ?? null,
    };
  }
  if (!hit) return Promise.resolve(false);
  const sent = reportHits([hit], options);
  context?.waitUntil(sent);
  return sent;
}
