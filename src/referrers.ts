/**
 * AI assistants whose answers send people to your site: a visit counts when the referrer is one of
 * `hosts` (or a subdomain), or the URL's `utm_source` is one of `utm` (ChatGPT tags the source links
 * under an answer with `utm_source=chatgpt.com`). Google's AI Overviews and AI Mode send google.com,
 * like any search, so they can't be told apart and aren't here.
 */
export type AiAssistant = {
  /** Stable id, lowercase. */
  key: string;
  name: string;
  hosts: string[];
  utm: string[];
};

export const AI_ASSISTANTS: AiAssistant[] = [
  { key: "chatgpt", name: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], utm: ["chatgpt.com", "chatgpt"] },
  { key: "perplexity", name: "Perplexity", hosts: ["perplexity.ai"], utm: ["perplexity", "perplexity.ai"] },
  { key: "claude", name: "Claude", hosts: ["claude.ai"], utm: ["claude.ai", "claude"] },
  { key: "gemini", name: "Gemini", hosts: ["gemini.google.com"], utm: ["gemini", "gemini.google.com"] },
  { key: "copilot", name: "Microsoft Copilot", hosts: ["copilot.microsoft.com"], utm: ["copilot", "copilot.com"] },
  { key: "grok", name: "Grok", hosts: ["grok.com"], utm: ["grok", "grok.com"] },
  { key: "deepseek", name: "DeepSeek", hosts: ["chat.deepseek.com"], utm: ["deepseek"] },
  { key: "meta-ai", name: "Meta AI", hosts: ["meta.ai"], utm: ["meta.ai"] },
  { key: "mistral", name: "Le Chat", hosts: ["chat.mistral.ai"], utm: ["mistral", "chat.mistral.ai"] },
];

function hostOf(referer: string): string {
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * The AI assistant that sent a visitor, from the Referer header or the `utm_source` in the page's
 * query string ("?utm_source=chatgpt.com"), or null.
 */
export function detectAiReferral(referer: string | null | undefined, search = ""): AiAssistant | null {
  if (referer) {
    const host = hostOf(referer);
    const byHost = AI_ASSISTANTS.find((a) => a.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
    if (byHost) return byHost;
  }
  const utm = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("utm_source")?.toLowerCase();
  if (!utm) return null;
  return AI_ASSISTANTS.find((a) => a.utm.includes(utm)) ?? null;
}

const ASSET_DIR = /^\/(_next|api|cdn-cgi|static|assets)\//;
const ASSET_FILE = /\.(js|mjs|css|map|json|xml|txt|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp4|webm|pdf|zip)$/i;

/** A page someone lands on, not a file or endpoint it loads. */
export function isPagePath(pathname: string): boolean {
  return !ASSET_DIR.test(pathname) && !ASSET_FILE.test(pathname);
}

/** Only the referrer's origin leaves your server ("https://chatgpt.com"), never the rest of its URL. */
export function refererOrigin(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
