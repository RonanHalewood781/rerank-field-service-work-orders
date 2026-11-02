import { z } from "zod";
import type { InfraiRerankClient } from "./infrai-rerank-client.ts";

export const WorkOrderRequest = z.object({
  query: z.string().min(1),
  top_k: z.number().int().positive().max(20),
  candidates: z.array(z.object({ id: z.string(), summary: z.string(), dispatch_status: z.string(), photo_notes: z.string(), technician_follow_up: z.string() })).min(1)
});
export type WorkOrderRequest = z.infer<typeof WorkOrderRequest>;

export function candidateText(item: WorkOrderRequest["candidates"][number]): string {
  return `${item.id} | summary: ${item.summary} | dispatch: ${item.dispatch_status} | photos: ${item.photo_notes} | follow-up: ${item.technician_follow_up}`;
}

export async function rerankWorkOrders(input: unknown, client: Pick<InfraiRerankClient, "rerank">) {
  const request = WorkOrderRequest.parse(input);
  const ranked = await client.rerank(request.query, request.candidates.map(candidateText), request.top_k);
  return ranked.map((result) => ({ ...request.candidates[result.index], score: result.score }));
}
