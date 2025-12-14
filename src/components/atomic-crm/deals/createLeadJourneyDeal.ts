import type { DataProvider, Identifier } from "ra-core";

type MinimalContactLike = {
  id: Identifier;
  first_name?: string | null;
  last_name?: string | null;
  sales_id?: Identifier | null;
  company_id?: Identifier | null;
};

/**
 * "Lead Journey" is backed by the `deals` table (resource name: "lead-journey").
 *
 * The schema has evolved over time:
 * - legacy: deals.contact_ids[] (array of contact IDs)
 * - current: deals.lead_id (single contact ID)
 * - optional newer: deals.first_name / deals.last_name (denormalized for display)
 *
 * This helper writes the correct record and gracefully falls back based on
 * which columns exist in the DB, so imports don't silently miss Lead Journey.
 */
export async function createLeadJourneyDealForContact(
  dataProvider: DataProvider,
  contact: MinimalContactLike,
  fallbackSalesId?: Identifier,
) {
  const now = new Date().toISOString();
  const name =
    `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "New Lead";
  const sales_id = (contact.sales_id ?? fallbackSalesId ?? null) as any;

  const baseData: any = {
    name,
    stage: "new",
    index: 0,
    sales_id,
    company_id: (contact.company_id ?? null) as any,
    created_at: now,
    updated_at: now,
  };

  // Attempt 1: newest schema (lead_id + first/last name columns)
  try {
    return await dataProvider.create("lead-journey", {
      data: {
        ...baseData,
        lead_id: contact.id,
        first_name: contact.first_name ?? null,
        last_name: contact.last_name ?? null,
      },
    });
  } catch {
    // ignore - fall through
  }

  // Attempt 2: schema with lead_id but without first/last name columns
  try {
    return await dataProvider.create("lead-journey", {
      data: {
        ...baseData,
        lead_id: contact.id,
      },
    });
  } catch {
    // ignore - fall through
  }

  // Attempt 3: legacy schema (contact_ids array, no lead_id column)
  return await dataProvider.create("lead-journey", {
    data: {
      ...baseData,
      contact_ids: [contact.id],
    },
  });
}

