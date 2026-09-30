/**
 * One request as Picked's ingest endpoint takes it: an AI bot's, or (with `referer`) a person's
 * page view that came from an AI answer.
 */
export type CrawlerHit = {
  host?: string;
  /** For a visit from an AI answer, with its query string, so `utm_source` can be read. */
  path: string;
  userAgent: string;
  /** A visit from an AI answer: the referrer's origin only ("https://chatgpt.com"). */
  referer?: string | null;
  /** The bot's IP as your server saw it. Picked checks it against the ranges the AI companies publish. */
  ip?: string | null;
  /** Two-letter country code from your CDN (cf-ipcountry, x-vercel-ip-country). */
  country?: string | null;
  status?: number | null;
  /** Milliseconds since the epoch. */
  at?: number;
};

export type ReportOptions = {
  /**
   * Your project's ingest URL, from Picked's Analytics page ("Your server"). It holds the
   * project's key, so keep it in server code. Defaults to the PICKED_INGEST_URL environment variable.
   */
  endpoint?: string;
  /** Called when sending fails. Sending never throws. */
  onError?: (error: unknown) => void;
  /**
   * Also send page views from people who came from an AI answer (ChatGPT, Perplexity, Claude,
   * Gemini...), by their referrer or utm_source: the page, the assistant's origin, the time. No IP,
   * no cookie. Default true; false sends AI bots only.
   */
  referrals?: boolean;
};

function envEndpoint(): string | undefined {
  // `process` doesn't exist on every runtime (Cloudflare Workers without nodejs_compat).
  return typeof process !== "undefined" ? process.env?.PICKED_INGEST_URL : undefined;
}

/** Sends hits to Picked. Resolves true when Picked took them; never rejects. */
export async function reportHits(hits: CrawlerHit[], options: ReportOptions = {}): Promise<boolean> {
  const endpoint = options.endpoint ?? envEndpoint();
  if (!endpoint || hits.length === 0) return false;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hits: hits.slice(0, 200).map((hit) => ({ at: Date.now(), ...hit })) }),
    });
    if (!response.ok) throw new Error(`Picked answered ${response.status}`);
    return true;
  } catch (error) {
    options.onError?.(error);
    return false;
  }
}

/** First address in x-forwarded-for, else the other headers proxies and CDNs set. */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("cf-connecting-ip") || headers.get("x-real-ip") || null;
}

export function cdnCountry(headers: { get(name: string): string | null }): string | null {
  return headers.get("cf-ipcountry") ?? headers.get("x-vercel-ip-country") ?? null;
}
