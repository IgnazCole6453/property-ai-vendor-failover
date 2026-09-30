import { createServer } from "node:http";
import { ZodError } from "zod";
import { createPropertyPlanner } from "./infrai_property_planner.js";
import { PropertyCaseSchema } from "./property_case.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const planPropertyCase = createPropertyPlanner(apiKey);
const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method !== "POST" || request.url !== "/property-cases/plan") {
    response.writeHead(404).end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const item = PropertyCaseSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const plan = await planPropertyCase(item);
    response.writeHead(200).end(JSON.stringify({ propertyId: item.propertyId, plan }));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid property case" }));
      return;
    }
    console.error(error);
    response.writeHead(502).end(JSON.stringify({ error: "Planning request was not completed" }));
  }
});

server.listen(port, () => console.log(`Property triage listening on http://localhost:${port}`));
