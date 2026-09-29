import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, test } from "node:test";
import { AI_BOTS, detectAiBot, isAiBot, reportHits } from "../dist/index.js";
import { aiCrawlers } from "../dist/express.js";
import { trackAiCrawler as trackFetch } from "../dist/fetch.js";
import { trackAiCrawler as trackNext } from "../dist/next.js";

const CHATGPT_USER =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const ENDPOINT = "https://picked.so/api/ingest/test-key";

let sent;
const realFetch = globalThis.fetch;
beforeEach(() => {
  sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return new Response("{}", { status: 200 });
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("detects the bots by user agent", () => {
  assert.equal(detectAiBot(CHATGPT_USER)?.key, "chatgpt-user");
  assert.equal(detectAiBot("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")?.company, "Anthropic");
  assert.equal(detectAiBot(CHROME), null);
  assert.equal(detectAiBot(""), null);
  assert.equal(detectAiBot(null), null);
  assert.equal(isAiBot("GPTBot/1.2"), true);
  const googleAgent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Google-Agent; +https://developers.google.com/crawling/docs/crawlers-fetchers/google-agent) Chrome/140.0.0.0 Safari/537.36";
  assert.equal(detectAiBot(googleAgent)?.purpose, "agent");
  assert.equal(detectAiBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), null);
  for (const bot of AI_BOTS) assert.equal(detectAiBot(`x ${bot.match}/1.0`)?.key, bot.key);
});

test("reportHits posts the batch and never throws", async () => {
  assert.equal(await reportHits([{ path: "/", userAgent: CHATGPT_USER }], { endpoint: ENDPOINT }), true);
  assert.equal(sent[0].url, ENDPOINT);
  assert.equal(sent[0].body.hits[0].path, "/");
  assert.equal(typeof sent[0].body.hits[0].at, "number");

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  let reported;
  assert.equal(await reportHits([{ path: "/", userAgent: CHATGPT_USER }], { endpoint: ENDPOINT, onError: (e) => (reported = e) }), false);
  assert.equal(reported.message, "offline");
});

test("without an endpoint nothing is sent", async () => {
  delete process.env.PICKED_INGEST_URL;
  assert.equal(await reportHits([{ path: "/", userAgent: CHATGPT_USER }]), false);
  assert.equal(sent.length, 0);
});

test("Next.js: only AI bots, sent through waitUntil", async () => {
  const waits = [];
  const event = { waitUntil: (p) => waits.push(p) };
  const request = (ua) => ({
    headers: new Headers({ "user-agent": ua, "x-forwarded-for": "20.171.206.10, 10.0.0.1", "cf-ipcountry": "US" }),
    nextUrl: { host: "example.com", pathname: "/pricing" },
  });
  trackNext(request(CHROME), event, { endpoint: ENDPOINT });
  assert.equal(waits.length, 0);
  trackNext(request(CHATGPT_USER), event, { endpoint: ENDPOINT });
  await Promise.all(waits);
  assert.deepEqual(
    { ...sent[0].body.hits[0], at: 0 },
    { at: 0, host: "example.com", path: "/pricing", userAgent: CHATGPT_USER, ip: "20.171.206.10", country: "US" },
  );
});

test("Express: sent on finish with the status, path without the query", async () => {
  const res = Object.assign(new EventEmitter(), { statusCode: 404 });
  const req = {
    hostname: "example.com",
    originalUrl: "/docs?x=1",
    ip: "20.171.206.10",
    get: (name) => ({ "user-agent": CHATGPT_USER })[name],
  };
  let nexted = false;
  aiCrawlers({ endpoint: ENDPOINT })(req, res, () => (nexted = true));
  assert.equal(nexted, true);
  assert.equal(sent.length, 0);
  res.emit("finish");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent[0].body.hits[0].path, "/docs");
  assert.equal(sent[0].body.hits[0].status, 404);
});

test("Fetch API: status from the response, waitUntil when given", async () => {
  const waits = [];
  const request = new Request("https://example.com/blog/post?ref=x", {
    headers: { "user-agent": "PerplexityBot/1.0", "cf-connecting-ip": "54.90.207.250" },
  });
  const ok = await trackFetch(request, new Response("hi", { status: 200 }), { waitUntil: (p) => waits.push(p) }, { endpoint: ENDPOINT });
  assert.equal(ok, true);
  assert.equal(waits.length, 1);
  assert.equal(sent[0].body.hits[0].path, "/blog/post");
  assert.equal(sent[0].body.hits[0].ip, "54.90.207.250");
  assert.equal(await trackFetch(new Request("https://example.com/", { headers: { "user-agent": CHROME } })), false);
});
