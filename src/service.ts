import { createServer } from "node:http";
import { InfraiRerankClient } from "./infrai-rerank-client.ts";
import { rerankWorkOrders } from "./rerank-work-orders.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");
const client = new InfraiRerankClient(key);

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/rerank") { res.writeHead(404).end(); return; }
  try {
    const body = await new Promise<string>((resolve, reject) => { let text = ""; req.on("data", (chunk) => { text += chunk; }); req.on("end", () => resolve(text)); req.on("error", reject); });
    const result = await rerankWorkOrders(JSON.parse(body), client);
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ results: result }));
  } catch (error) {
    const status = error instanceof Error && error.name === "ZodError" ? 400 : 502;
    res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }));
  }
}).listen(3000, () => console.log("field-service rerank listening on http://localhost:3000"));
