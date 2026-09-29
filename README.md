# @picked-so/crawler-detect

See which AI crawlers read your site:

| Company | Bots |
| --- | --- |
| OpenAI (ChatGPT) | ChatGPT-User, OAI-SearchBot, GPTBot |
| Anthropic (Claude) | Claude-User, Claude-SearchBot, ClaudeBot |
| Google AI (Gemini) | Google-Agent, Google-GeminiNotebook, GoogleOther |
| Perplexity | Perplexity-User, PerplexityBot |
| Apple, Amazon, Meta, Mistral, DuckDuckGo, ByteDance, Common Crawl | Applebot, Amazonbot, Amzn-SearchBot, Meta's fetcher and crawler, MistralAI-User, DuckAssistBot, Bytespider, CCBot |

Google's AI Overviews and AI Mode read pages as Googlebot, so no package can single them out:
see [What about Google's AI answers?](#what-about-googles-ai-answers).

Two things in one small package with no dependencies:

1. **Detection.** `detectAiBot(userAgent)` tells you which AI bot sent a request, which company runs
   it and why it came (to answer someone's question right now, to act for someone as an agent, to
   build a search index, or to collect training data). Use it on its own for logs, rate limits or analytics.
2. **Reporting to [Picked](https://picked.so).** One line in Next.js, Express or any Fetch API server
   sends each AI bot visit to Picked, which verifies the bot by IP and shows which pages each AI
   reads, next to what ChatGPT, Claude and Gemini say about your brand.

```bash
npm install @picked-so/crawler-detect
```

## Detect an AI bot

```ts
import { detectAiBot } from "@picked-so/crawler-detect";

detectAiBot("Mozilla/5.0 ... compatible; ChatGPT-User/1.0; +https://openai.com/bot");
// { key: "chatgpt-user", name: "ChatGPT-User", company: "OpenAI", purpose: "answer", match: "ChatGPT-User" }

detectAiBot("Mozilla/5.0 (Macintosh ...) Chrome/140.0 Safari/537.36");
// null
```

`purpose` is why the bot came:

| Purpose | Meaning | Examples |
| --- | --- | --- |
| `answer` | Fetched live because someone asked the assistant a question | ChatGPT-User, Claude-User, Perplexity-User |
| `search` | Builds the index the assistant searches | OAI-SearchBot, Claude-SearchBot, PerplexityBot |
| `agent` | An AI agent browsing the site for someone | Google-Agent |
| `training` | Collected to train future models | GPTBot, ClaudeBot, CCBot |

`AI_BOTS` is the full list, `AI_BOTS_PATTERN` one regex for all of them, `isAiBot(ua)` a boolean.

A user agent is easy to fake: most "GPTBot" traffic on a typical site is a scanner borrowing the
name. Detection by user agent tells you who a request *says* it is. Picked checks each reported
hit's IP against the ranges OpenAI, Anthropic, Perplexity, Google and Apple publish.

## What about Google's AI answers?

AI Overviews and AI Mode read your pages as **Googlebot**, the same crawler as Google Search, so no
user agent can tell an AI Overview's visit from a normal one. `Google-Extended` isn't a crawler
either: it's a `robots.txt` token that says whether Gemini may train on what Googlebot already
fetched. What Google does send with a user agent of its own, and this package detects:

- **Google-Agent**: agents running on Google's infrastructure that browse and act for a user.
- **Google-GeminiNotebook**: Gemini Notebook fetching a URL someone added as a source.
- **GoogleOther**: a general fetcher Google's teams use for research; Cloudflare counts it as an AI
  crawler.

(From Google's crawler documentation, checked September 29, 2026.) To see whether AI Overviews
name you, you need the answers themselves, which is what [Picked](https://picked.so) tracks.

## Send AI bot visits to Picked

In Picked's **Analytics** page, pick **Your server** as the source of crawler data and copy the
ingest URL it shows. It contains your
project's key, so keep it in server code: set it as `PICKED_INGEST_URL` in your environment, or pass
it as `endpoint`. Only requests from AI bots are sent, after the response; everything else costs one
regex test. Sending never throws and never delays the visitor.

### Next.js

In `proxy.ts` (Next.js 16) or `middleware.ts` (13 to 15):

```ts
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { trackAiCrawler } from "@picked-so/crawler-detect/next";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  trackAiCrawler(request, event);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Already have a proxy? Add the `trackAiCrawler(request, event)` line to it.

### Express

```js
import express from "express";
import { aiCrawlers } from "@picked-so/crawler-detect/express";

const app = express();
app.set("trust proxy", true); // behind a proxy or load balancer, so req.ip is the bot's
app.use(aiCrawlers());
```

The hit is sent when the response finishes, with its status code.

### Cloudflare Workers, Hono, Bun, Deno, Remix, SvelteKit, Astro

Anything that handles a Fetch API `Request`:

```ts
import { trackAiCrawler } from "@picked-so/crawler-detect/fetch";

export default {
  async fetch(request: Request, env: { PICKED_INGEST_URL: string }, ctx: ExecutionContext) {
    const response = await fetch(request); // or your app's handler
    trackAiCrawler(request, response, ctx, { endpoint: env.PICKED_INGEST_URL });
    return response;
  },
};
```

Without a `waitUntil` context, `await` the returned promise instead.

### Anything else

`reportHits(hits, { endpoint })` posts up to 200 hits at once:

```ts
import { reportHits } from "@picked-so/crawler-detect";

await reportHits([
  { host: "example.com", path: "/pricing", userAgent, ip: "20.171.206.10", status: 200, country: "US" },
]);
```

## Options

| Option | Default | |
| --- | --- | --- |
| `endpoint` | `process.env.PICKED_INGEST_URL` | Your project's ingest URL from Picked |
| `onError` | none | Called with the error when a send fails |

## License

MIT. Made by [Picked](https://picked.so), the AI visibility tool: track what ChatGPT, Claude and
Gemini recommend, then write the article that wins the answer.
