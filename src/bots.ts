/**
 * AI crawlers by user agent. `purpose` is why the bot reads a page:
 * - answer: fetched live because someone asked the assistant a question (ChatGPT-User).
 * - agent: an AI agent browsing the site for someone (Google-Agent).
 * - search: builds the index an assistant searches (OAI-SearchBot, PerplexityBot).
 * - training: collected to train future models (GPTBot, ClaudeBot).
 * Order matters: the first `match` found in the user agent wins.
 */
export type CrawlerPurpose = "answer" | "agent" | "search" | "training";

export type AiBot = {
  /** Stable id, lowercase. */
  key: string;
  /** The name the company gives the bot. */
  name: string;
  company: string;
  purpose: CrawlerPurpose;
  /** Case-sensitive substring of the user agent. */
  match: string;
};

export const AI_BOTS: readonly AiBot[] = [
  { key: "chatgpt-user", name: "ChatGPT-User", company: "OpenAI", purpose: "answer", match: "ChatGPT-User" },
  { key: "oai-searchbot", name: "OAI-SearchBot", company: "OpenAI", purpose: "search", match: "OAI-SearchBot" },
  { key: "gptbot", name: "GPTBot", company: "OpenAI", purpose: "training", match: "GPTBot" },
  { key: "claude-user", name: "Claude-User", company: "Anthropic", purpose: "answer", match: "Claude-User" },
  { key: "claude-searchbot", name: "Claude-SearchBot", company: "Anthropic", purpose: "search", match: "Claude-SearchBot" },
  { key: "claudebot", name: "ClaudeBot", company: "Anthropic", purpose: "training", match: "ClaudeBot" },
  { key: "perplexity-user", name: "Perplexity-User", company: "Perplexity", purpose: "answer", match: "Perplexity-User" },
  { key: "perplexitybot", name: "PerplexityBot", company: "Perplexity", purpose: "search", match: "PerplexityBot" },
  { key: "meta-externalfetcher", name: "Meta fetcher", company: "Meta", purpose: "answer", match: "meta-externalfetcher" },
  { key: "meta-webindexer", name: "Meta-WebIndexer", company: "Meta", purpose: "search", match: "meta-webindexer" },
  { key: "meta-externalagent", name: "Meta crawler", company: "Meta", purpose: "training", match: "meta-externalagent" },
  { key: "mistralai-user", name: "MistralAI-User", company: "Mistral", purpose: "answer", match: "MistralAI-User" },
  { key: "duckassistbot", name: "DuckAssistBot", company: "DuckDuckGo", purpose: "answer", match: "DuckAssistBot" },
  { key: "applebot", name: "Applebot", company: "Apple", purpose: "search", match: "Applebot" },
  { key: "amzn-searchbot", name: "Amzn-SearchBot", company: "Amazon", purpose: "search", match: "Amzn-SearchBot" },
  { key: "amazonbot", name: "Amazonbot", company: "Amazon", purpose: "training", match: "Amazonbot" },
  // Google's AI answers (AI Overviews, AI Mode) read pages as Googlebot: no user agent of their own.
  { key: "google-agent", name: "Google-Agent", company: "Google", purpose: "agent", match: "Google-Agent" },
  { key: "google-gemininotebook", name: "Gemini Notebook", company: "Google", purpose: "answer", match: "Google-GeminiNotebook" },
  { key: "googleother", name: "GoogleOther", company: "Google", purpose: "training", match: "GoogleOther" },
  { key: "bytespider", name: "Bytespider", company: "ByteDance", purpose: "training", match: "Bytespider" },
  { key: "ccbot", name: "CCBot", company: "Common Crawl", purpose: "training", match: "CCBot" },
  // Parallel (parallel.ai/parallel-web-systems-bots): its search API's index and its live fetches.
  { key: "shap-user", name: "Shap-User", company: "Parallel", purpose: "answer", match: "Shap-User" },
  { key: "shapbot", name: "ShapBot", company: "Parallel", purpose: "search", match: "ShapBot" },
  // Coding agents reading docs for a developer. OpenCode sends a plain Chrome user agent and
  // names itself only on a retry after a block, so most of its reads aren't caught.
  { key: "cursor", name: "Cursor", company: "Cursor", purpose: "agent", match: "Cursor/" },
  { key: "opencode", name: "OpenCode", company: "OpenCode", purpose: "agent", match: "opencode" },
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One regex for every bot above, for a quick test before anything else. */
export const AI_BOTS_PATTERN = new RegExp(AI_BOTS.map((bot) => escape(bot.match)).join("|"));

/** The AI bot a user agent names, or null. A user agent is easy to fake: see the README on verifying. */
export function detectAiBot(userAgent: string | null | undefined): AiBot | null {
  if (!userAgent || !AI_BOTS_PATTERN.test(userAgent)) return null;
  return AI_BOTS.find((bot) => userAgent.includes(bot.match)) ?? null;
}

export function isAiBot(userAgent: string | null | undefined): boolean {
  return detectAiBot(userAgent) !== null;
}
