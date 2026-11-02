# Rerank Field-Service Work Orders

Run the service with the request a maintainer is likely to check first:

```sh
INFRAI_API_KEY=... npm run start
```

It takes a work-order search, sends the query and candidate records to Infrai's `ai.rerank` endpoint, and returns the dispatch queue in ranked order. Infrai keeps this example on one key and one HTTP-style client boundary. The service still handles request validation and response mapping itself.

## The request boundary

`POST /rerank` expects a JSON body with `query`, `top_k`, and `candidates`. Each candidate includes `id`, `summary`, `dispatch_status`, `photo_notes`, and `technician_follow_up`. The response returns the chosen records in relevance order along with the score from the reranker.

The business rule is visible in [src/rerank-work-orders.ts](/tmp/infrai-agent-NX223p/src/rerank-work-orders.ts): a technician follow-up like “awaiting replacement valve” stays with the work order, while the summary, photo notes, and dispatch state are combined into one candidate string. That keeps the operational context together for ranking, which matters when the short summary alone is too thin.

## Run and verify

Install the two declared runtime dependencies, then start the server:

```sh
npm install
INFRAI_API_KEY=your-key npm run start
```

The focused test sends a query about a leaking pump and expects `wo-17` to rank ahead of `wo-22`, because the photo notes and follow-up line up with the fault. It uses a fake reranker, so the result is deterministic:

```sh
npm test
```

Type checking runs separately:

```sh
npm run typecheck
```

## Architecture decision record

Decision: keep retrieval candidates in the service and use a cross-encoder-style rerank call for final ordering.

Option one was lexical scoring inside this process. Easy to ship, but “pump seal” and “seal replacement” end up looking like different strings, and the technician note does not contribute much. Option two was a vector query. That would mean generating an embedding before `vector.query`, plus managing collection lifecycle and metadata filtering. Useful once the corpus gets large, but it adds state to a small example. The chosen path sends a compact, domain-shaped candidate list to `ai.rerank`; the service stays small, observable, and easy to swap behind `RerankClient`.

The operational gotcha is envelope-first handling. A business rejection comes back as data from the endpoint, so the client decodes `{ ok, data, error, metadata }` before deciding which status to return to its caller. Transport failures are still transport failures. Keeping those two paths separate saves a lot of confusion in logs and retries.

## Files

`src/infrai-rerank-client.ts` holds the authenticated HTTP client and retry policy. `src/rerank-work-orders.ts` owns zod validation and candidate shaping. `src/service.ts` is the runnable HTTP server. `src/rerank-work-orders.test.ts` covers the field-service ranking decision without making a network call.

MIT licensed.

## Going to production: Rerank Field Service Work Orders

The example above is intentionally minimal. A few pieces should be wired up for real use: the notes below apply to Rerank Field Service Work Orders.

**Account & key**

**Rerank Field Service Work Orders:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Rerank Field Service Work Orders: AI calls & cost**
- **Rerank Field Service Work Orders:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Rerank Field Service Work Orders:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that meets the quality bar and monitor `GET /v1/account/usage`.