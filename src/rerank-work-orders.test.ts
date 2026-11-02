import assert from "node:assert/strict";
import { rerankWorkOrders } from "./rerank-work-orders.ts";

const input = { query: "leaking pump", top_k: 2, candidates: [
  { id: "wo-17", summary: "Pump inspection", dispatch_status: "ready", photo_notes: "water around seal", technician_follow_up: "awaiting replacement valve" },
  { id: "wo-22", summary: "Panel reset", dispatch_status: "queued", photo_notes: "dry enclosure", technician_follow_up: "confirm access" }
] };
const result = await rerankWorkOrders(input, { rerank: async (query, candidates, top_k) => { assert.equal(query, "leaking pump"); assert.equal(candidates[0].includes("replacement valve"), true); return [{ index: 0, score: 0.98 }, { index: 1, score: 0.21 }].slice(0, top_k); } });
assert.equal(result[0].id, "wo-17");
assert.equal(result[0].score, 0.98);
console.log("field-service decision: wo-17 ranks first");
