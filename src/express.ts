import { detectAiBot } from "./bots.js";
import { reportHits, type ReportOptions } from "./report.js";

/** The parts of Express's req and res this uses, so the package doesn't depend on Express. */
type ExpressLikeRequest = { hostname: string; originalUrl: string; ip?: string; get(name: string): string | undefined };
type ExpressLikeResponse = { statusCode: number; on(event: "finish", listener: () => void): unknown };

/**
 * Express (or Connect-style) middleware: `app.use(aiCrawlers())`, before your routes. The hit is
 * sent once the response is out, with its status. Behind a proxy, set `app.set("trust proxy", true)`
 * so `req.ip` is the bot's address.
 */
export function aiCrawlers(options?: ReportOptions) {
  return (req: ExpressLikeRequest, res: ExpressLikeResponse, next: () => void) => {
    const userAgent = req.get("user-agent");
    if (userAgent && detectAiBot(userAgent)) {
      res.on("finish", () => {
        void reportHits(
          [
            {
              host: req.hostname,
              path: req.originalUrl.split("?")[0] ?? req.originalUrl,
              userAgent,
              ip: req.ip ?? null,
              country: req.get("cf-ipcountry") ?? null,
              status: res.statusCode,
            },
          ],
          options,
        );
      });
    }
    next();
  };
}
