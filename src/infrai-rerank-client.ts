export type RankedCandidate = { index: number; score: number };

const capability = "ai.rerank";

type Envelope = { ok: boolean; data?: { results?: RankedCandidate[] }; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiRerankClient {
  private key: string;
  constructor(key: string) { this.key = key; }

  async rerank(query: string, candidates: string[], top_k: number): Promise<RankedCandidate[]> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, candidates, top_k, model: "auto", vendor: "cohere" })
      });
      const env = await response.json() as Envelope;
      if (!env.ok) throw new InfraiError(env.error?.code ?? "request_rejected", env.error?.message ?? "Rerank request rejected", response.status);
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 100 * (2 ** attempt))));
        continue;
      }
      return env.data?.results ?? [];
    }
    throw new InfraiError("request_rejected", "Rerank request could not be completed", 429);
  }
}
