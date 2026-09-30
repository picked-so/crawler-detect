import { detectAiBot } from "./bots.js";
import { detectAiReferral, isPagePath, refererOrigin } from "./referrers.js";
import { reportHits, type CrawlerHit, type ReportOptions } from "./report.js";

/** The parts of Express's req and res this uses, so the package doesn't depend on Express. */
type ExpressLikeRequest = {
  method?: string;
  hostname: string;
  originalUrl: string;
  ip?: string;
  get(name: string): string | undefined;
};
type ExpressLikeResponse = { statusCode: number; on(event: "finish", listener: () => void): unknown };

/**
 * Express (or Connect-style) middleware: `app.use(aiCrawlers())`, before your routes. AI bot
 * requests, and page views from people who came from an AI answer, are sent once the response is
 * out, with its status. Behind a proxy, set `app.set("trust proxy", true)` so `req.ip` is the bot's address.
 */
export function aiCrawlers(options?: ReportOptions) {
  return (req: ExpressLikeRequest, res: ExpressLikeResponse, next: () => void) => {
    const userAgent = req.get("user-agent");
    const [pathname = "/", query = ""] = req.originalUrl.split("?");
    let hit: CrawlerHit | null = null;
    if (userAgent && detectAiBot(userAgent)) {
      hit = { host: req.hostname, path: pathname, userAgent, ip: req.ip ?? null, country: req.get("cf-ipcountry") ?? null };
    } else if (
      userAgent &&
      options?.referrals !== false &&
      (req.method ?? "GET") === "GET" &&
      isPagePath(pathname) &&
      detectAiReferral(req.get("referer"), query)
    ) {
      hit = { host: req.hostname, path: req.originalUrl, userAgent, referer: refererOrigin(req.get("referer")) };
    }
    if (hit) {
      const sent = hit;
      res.on("finish", () => {
        void reportHits([{ ...sent, status: res.statusCode }], options);
      });
    }
    next();
  };
}
