import assert from "node:assert/strict";
import test from "node:test";
import { buildPlanningInput, PropertyCaseSchema } from "../src/property_case.js";

test("an active water hazard cannot be planned below immediate priority", () => {
  const item = PropertyCaseSchema.parse({
    kind: "maintenance_request",
    propertyId: "harbor-12",
    unit: "4B",
    category: "water",
    description: "Water is reaching the electrical cabinet",
    activeHazard: true
  });

  assert.equal(buildPlanningInput(item).priorityFloor, "immediate");
});

test("tenant document planning sends metadata, not document contents", () => {
  const item = PropertyCaseSchema.parse({
    kind: "tenant_document",
    propertyId: "harbor-12",
    documentType: "insurance",
    receivedAt: "2026-09-27T08:00:00.000Z",
    reviewState: "needs_review"
  });

  assert.deepEqual(Object.keys(buildPlanningInput(item).record).sort(), [
    "documentType",
    "kind",
    "propertyId",
    "receivedAt",
    "reviewState"
  ]);
});
