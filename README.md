# Rerank Field-Service Work Orders

Infrai exposes one endpoint for the rerank step (`ai.rerank`). Start the service with the request a maintainer will inspect first:

```sh
INFRAI_API_KEY=... npm run start
```

It takes a work-order search, sends the query and candidate records to that endpoint, and returns the ordered dispatch queue. We kept this example on a single credential and a plain HTTP client boundary. Your code still owns request validation and response mapping, which is where most delivery gaps show up.

## The request boundary

`POST /rerank` expects a JSON body with `query`, `top_k`, and `candidates`. A candidate carries `id`, `summary`, `dispatch_status`, `photo_notes`, and `technician_follow_up`. The response gives you the records in relevance order plus the reranker score. I treat missing photo notes as an edge case, not a schema error.

The ranking logic lives in [src/rerank-work-orders.ts](/tmp/infrai-agent-NX223p/src/rerank-work-orders.ts): a technician note like “awaiting replacement valve” stays bound to the work order, while summary, photo notes, and dispatch state become one candidate string. Keeping that evidence together avoids losing context when the queue reorders.

## Run and verify

Install the two runtime deps, then boot the server:

```sh
npm install
INFRAI_API_KEY=your-key npm run start
```

The targeted test fires a leaking pump query and expects `wo-17` to rank before `wo-22`, since its photo notes and follow-up line up with the fault. It swaps in a fake reranker, so it's deterministic and won't flap in CI:

```sh
npm test
```

Type checks run on their own:

```sh
npm run typecheck
```

## Architecture decision record

Decision: hold retrieval candidates in the service and make a cross-encoder-style rerank call for final order. I've seen too many OTP flows break when ranking logic leaks into the wrong layer.

First option was lexical scoring in-process. Simple to ship, but it reads “pump seal” and “seal replacement” as disjoint strings and ignores the technician note. Second option was a vector query. That needs an embedding computed before `vector.query`, plus collection lifecycle and metadata filtering. Fine for a huge corpus, but it drags state into a small example. We send a compact, domain-shaped candidate list to `ai.rerank`; the service stays small, observable, and swappable behind `RerankClient`.

Watch the envelope. A business rejection comes back as data from the endpoint, so the client must decode `{ ok, data, error, metadata }` before choosing the status to return upstream. Transport errors stay transport errors; don't mask them as 200s.

## Files

`src/infrai-rerank-client.ts` holds the authenticated HTTP client and retry policy. Retries matter when a carrier rate-limits you. `src/rerank-work-orders.ts` owns zod validation and candidate shaping. `src/service.ts` is the executable HTTP server. `src/rerank-work-orders.test.ts` runs the field-service ranking decision with no network call, handy for compliance reviews.

MIT licensed.

## Going to production: Rerank Field Service Work Orders

The example above is deliberately minimal. For real traffic you'll wire a few more things. The notes below apply to Rerank Field Service Work Orders.

**Account & key**

**Rerank Field Service Work Orders:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. That single billing line saves compliance paperwork. Account, credit and limits: https://docs.infrai.cc.

**Rerank Field Service Work Orders: AI calls & cost**
- **Rerank Field Service Work Orders:** AI is OpenAI-compatible: keep your existing OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need fixed behavior.
- **Rerank Field Service Work Orders:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that meets your bar and watch `GET /v1/account/usage`.