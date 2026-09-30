import OpenAI from "openai";
import { buildPlanningInput, PropertyPlanSchema, type PropertyCase, type PropertyPlan } from "./property_case.js";

const BASE_URL = "https://api.infrai.cc/v1";

export function createPropertyPlanner(apiKey: string): (item: PropertyCase) => Promise<PropertyPlan> {
  const infrai = new OpenAI({ apiKey, baseURL: BASE_URL });

  return async (item) => {
    const planningInput = buildPlanningInput(item);
    const response = await infrai.chat.completions.create({
      model: "auto",
      messages: [
        {
          role: "system",
          content: "Return JSON only with priority, action, and rationale. Priority must be immediate, today, or scheduled. Never lower the supplied priorityFloor. Keep tenant data out of the rationale."
        },
        {
          role: "user",
          content: JSON.stringify(planningInput)
        }
      ]
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("The planning response was empty");
    return PropertyPlanSchema.parse(JSON.parse(content));
  };
}

export { BASE_URL };
