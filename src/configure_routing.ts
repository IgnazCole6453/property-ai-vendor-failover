import { BASE_URL } from "./infrai_property_planner.js";

const RoutingEnvelope = {
  parse(value: unknown): { ok: boolean; data?: unknown; error?: { code?: string; message?: string } } {
    if (!value || typeof value !== "object" || !("ok" in value)) {
      throw new Error("Invalid Infrai response envelope");
    }
    return value as { ok: boolean; data?: unknown; error?: { code?: string; message?: string } };
  }
};

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) return Number(retryAfter) * 1000;
  return 250 * 2 ** attempt;
}

async function setRouting(apiKey: string): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}/account/routing/set`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ capability: "ai.chat" })
    });
    const envelope = RoutingEnvelope.parse(await response.json());

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new Error(envelope.error ? JSON.stringify(envelope.error) : "Routing update rejected");
    }
    return envelope.data;
  }
  throw new Error("Routing update retry limit reached");
}

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before configuring routing");

setRouting(apiKey)
  .then((data) => console.log("Routing preference saved:", data))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
