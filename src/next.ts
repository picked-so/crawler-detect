import { detectAiBot } from "./bots.js";
import { cdnCountry, clientIp, reportHits, type ReportOptions } from "./report.js";

/** The parts of NextRequest and NextFetchEvent this uses, so the package doesn't depend on Next. */
type NextLikeRequest = { headers: Headers; nextUrl: { host: string; pathname: string } };
type NextLikeEvent = { waitUntil(promise: Promise<unknown>): void };

/**
 * Call from your `proxy.ts` (Next.js 16) or `middleware.ts` (13 to 15). When the request comes
 * from an AI bot, the hit goes to Picked after the response; other requests cost one regex test.
 *
 *   export function proxy(request: NextRequest, event: NextFetchEvent) {
 *     trackAiCrawler(request, event);
 *     return NextResponse.next();
 *   }
 */
export function trackAiCrawler(request: NextLikeRequest, event: NextLikeEvent, options?: ReportOptions): void {
  const userAgent = request.headers.get("user-agent");
  if (!userAgent || !detectAiBot(userAgent)) return;
  event.waitUntil(
    reportHits(
      [
        {
          host: request.nextUrl.host,
          path: request.nextUrl.pathname,
          userAgent,
          ip: clientIp(request.headers),
          country: cdnCountry(request.headers),
        },
      ],
      options,
    ),
  );
}
