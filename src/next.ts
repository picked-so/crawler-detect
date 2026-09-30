import { detectAiBot } from "./bots.js";
import { detectAiReferral, isPagePath, refererOrigin } from "./referrers.js";
import { cdnCountry, clientIp, reportHits, type CrawlerHit, type ReportOptions } from "./report.js";

/** The parts of NextRequest and NextFetchEvent this uses, so the package doesn't depend on Next. */
type NextLikeRequest = { method?: string; headers: Headers; nextUrl: { host: string; pathname: string; search: string } };
type NextLikeEvent = { waitUntil(promise: Promise<unknown>): void };

/**
 * Call from your `proxy.ts` (Next.js 16) or `middleware.ts` (13 to 15). When the request comes
 * from an AI bot, or is a page view from someone who clicked through from an AI answer, it goes
 * to Picked after the response; other requests cost a regex test and a header read.
 *
 *   export function proxy(request: NextRequest, event: NextFetchEvent) {
 *     trackAiCrawler(request, event);
 *     return NextResponse.next();
 *   }
 */
export function trackAiCrawler(request: NextLikeRequest, event: NextLikeEvent, options?: ReportOptions): void {
  const userAgent = request.headers.get("user-agent");
  if (!userAgent) return;
  let hit: CrawlerHit | null = null;
  if (detectAiBot(userAgent)) {
    hit = {
      host: request.nextUrl.host,
      path: request.nextUrl.pathname,
      userAgent,
      ip: clientIp(request.headers),
      country: cdnCountry(request.headers),
    };
  } else if (
    options?.referrals !== false &&
    (request.method ?? "GET") === "GET" &&
    isPagePath(request.nextUrl.pathname) &&
    detectAiReferral(request.headers.get("referer"), request.nextUrl.search)
  ) {
    hit = {
      host: request.nextUrl.host,
      path: request.nextUrl.pathname + request.nextUrl.search,
      userAgent,
      referer: refererOrigin(request.headers.get("referer")),
    };
  }
  if (hit) event.waitUntil(reportHits([hit], options));
}
