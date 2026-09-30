import { z } from "zod";

const MaintenanceRequest = z.object({
  kind: z.literal("maintenance_request"),
  propertyId: z.string().min(1),
  unit: z.string().min(1),
  category: z.enum(["water", "electrical", "heating", "appliance", "other"]),
  description: z.string().min(1).max(1000),
  activeHazard: z.boolean()
});

const TenantDocument = z.object({
  kind: z.literal("tenant_document"),
  propertyId: z.string().min(1),
  documentType: z.enum(["lease", "insurance", "identity", "income", "other"]),
  receivedAt: z.string().datetime(),
  reviewState: z.enum(["new", "verified", "needs_review"])
});

const InspectionReminder = z.object({
  kind: z.literal("inspection_reminder"),
  propertyId: z.string().min(1),
  inspectionType: z.enum(["move_in", "move_out", "annual", "safety"]),
  dueDate: z.string().date(),
  tenantNotified: z.boolean()
});

export const PropertyCaseSchema = z.discriminatedUnion("kind", [
  MaintenanceRequest,
  TenantDocument,
  InspectionReminder
]);

export type PropertyCase = z.infer<typeof PropertyCaseSchema>;

export const PropertyPlanSchema = z.object({
  priority: z.enum(["immediate", "today", "scheduled"]),
  action: z.string().min(1),
  rationale: z.string().min(1)
});

export type PropertyPlan = z.infer<typeof PropertyPlanSchema>;

export function buildPlanningInput(item: PropertyCase): {
  priorityFloor: PropertyPlan["priority"];
  record: Record<string, unknown>;
} {
  if (item.kind === "maintenance_request") {
    return {
      priorityFloor: item.activeHazard ? "immediate" : "today",
      record: item
    };
  }

  if (item.kind === "tenant_document") {
    return {
      priorityFloor: item.reviewState === "needs_review" ? "today" : "scheduled",
      record: {
        kind: item.kind,
        propertyId: item.propertyId,
        documentType: item.documentType,
        receivedAt: item.receivedAt,
        reviewState: item.reviewState
      }
    };
  }

  return {
    priorityFloor: item.tenantNotified ? "scheduled" : "today",
    record: item
  };
}
