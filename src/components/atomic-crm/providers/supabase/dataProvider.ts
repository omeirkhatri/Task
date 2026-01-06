import { supabaseDataProvider } from "ra-supabase-core";
import {
  withLifecycleCallbacks,
  type CreateParams,
  type DataProvider,
  type GetListParams,
  type Identifier,
  type UpdateParams,
} from "ra-core";

import type {
  Contact,
  ContactNote,
  Deal,
  DealNote,
  RAFile,
  Sale,
  SalesFormData,
  SignUpData,
} from "../../types";
import { getActivityLog } from "../commons/activity";
import { getCompanyAvatar } from "../commons/getCompanyAvatar";
import { getContactAvatar } from "../commons/getContactAvatar";
import { mergeContacts } from "../commons/mergeContacts";
import { getIsInitialized } from "./authProvider";
import { supabase } from "./supabase";
import { logger } from "@/lib/logger";

if (import.meta.env.VITE_SUPABASE_URL === undefined) {
  throw new Error("Please set the VITE_SUPABASE_URL environment variable");
}
if (import.meta.env.VITE_SUPABASE_ANON_KEY === undefined) {
  throw new Error("Please set the VITE_SUPABASE_ANON_KEY environment variable");
}

const baseDataProvider = supabaseDataProvider({
  instanceUrl: import.meta.env.VITE_SUPABASE_URL,
  apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  supabaseClient: supabase,
  sortOrder: "asc,desc.nullslast" as any,
});

const processCompanyLogo = async (params: CreateParams<Company> | UpdateParams<Company>): Promise<CreateParams<Company> | UpdateParams<Company>> => {
  let logo = params.data.logo;

  if (typeof logo !== "object" || logo === null || !logo.src) {
    logo = await getCompanyAvatar(params.data);
  } else if (logo.rawFile instanceof File) {
    await uploadToBucket(logo);
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

async function processContactAvatar(
  params: UpdateParams<Contact>,
): Promise<UpdateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact>,
): Promise<CreateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact> | UpdateParams<Contact>,
): Promise<CreateParams<Contact> | UpdateParams<Contact>> {
  const { data } = params;
  if (data.avatar?.src || !data.email_jsonb || !data.email_jsonb.length) {
    return params;
  }
  const avatarUrl = await getContactAvatar(data);

  // Clone the data and modify the clone
  const newData = { ...data, avatar: { src: avatarUrl || undefined } };

  return { ...params, data: newData };
}

// Helper function to map resource names for data provider
const mapResourceName = (resource: string): string => {
  if (resource === "lead-journey") {
    return "deals";
  }
  if (resource === "contactNotes" || resource === "contact_notes") {
    return "contactNotes";
  }
  if (resource === "dealNotes" || resource === "deal_notes") {
    return "dealNotes";
  }
  if (resource === "companies") {
    return "companies_summary";
  }
  if (resource === "contacts" || resource === "clients") {
    return "contacts_summary";
  }
  return resource;
};

type RangeFilter = {
  field: string;
  gte?: string;
  lte?: string;
};

function parseInList(value?: string): string[] {
  if (!value) return [];
  return value
    .replace(/[()]/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeIdInFilters(
  existing: string | Identifier[] | undefined,
  ids: Iterable<Identifier>,
): string {
  const existingIds: Identifier[] = Array.isArray(existing)
    ? existing
    : typeof existing === "string"
      ? (parseInList(existing)
          .map((item) => Number(item))
          .filter((id) => !Number.isNaN(id)) as Identifier[])
      : [];
  const combined = new Set<Identifier>(existingIds);
  for (const id of ids) {
    combined.add(id);
  }
  if (combined.size === 0) return "(-1)";
  return `(${Array.from(combined).join(",")})`;
}

async function collectIdsForRanges(
  resource: string,
  ranges: RangeFilter[],
  baseFilter: Record<string, unknown>,
): Promise<Set<Identifier>> {
  const ids = new Set<Identifier>();
  for (const range of ranges) {
    const filterForRange: Record<string, unknown> = { ...baseFilter };
    if (range.gte) {
      filterForRange[`${range.field}@gte`] = range.gte;
    }
    if (range.lte) {
      filterForRange[`${range.field}@lte`] = range.lte;
    }

    const { data } = await baseDataProvider.getList(resource, {
      pagination: { page: 1, perPage: 10000 },
      sort: { field: "id", order: "ASC" },
      filter: filterForRange,
    });

    data?.forEach((record: any) => {
      if (record?.id !== undefined && record?.id !== null) {
        ids.add(record.id as Identifier);
      }
    });
  }
  return ids;
}

const dataProviderWithCustomMethods = {
  ...baseDataProvider,
  async getList(resource: string, params: GetListParams) {
    const mappedResource = mapResourceName(resource);
    
    // Debug: log payment_packages queries
    if (mappedResource === "payment_packages") {
      console.log("PaymentPackages getList - params:", JSON.stringify(params, null, 2));
    }
    
    // Debug: log payment_transactions queries
    if (mappedResource === "payment_transactions") {
      console.log("PaymentTransactions getList - resource:", resource, "mappedResource:", mappedResource);
      console.log("PaymentTransactions getList - params:", JSON.stringify(params, null, 2));
    }
    
    // Handle overdue installments filter for payment_packages
    if (mappedResource === "payment_packages" && params.filter && (params.filter as any).overdue_installments === true) {
      try {
        const today = new Date().toISOString().split("T")[0];
        // Get package IDs that have overdue installments
        const { data: overdueInstallments, error } = await supabase
          .from("installment_schedules")
          .select("payment_package_id")
          .eq("is_paid", false)
          .lt("due_date", today);

        if (error) throw error;

        const packageIds = overdueInstallments
          ? [...new Set(overdueInstallments.map((i) => i.payment_package_id))]
          : [];

        // Remove the custom filter and add id filter
        const { overdue_installments, ...restFilter } = params.filter as any;
        if (packageIds.length > 0) {
          params.filter = {
            ...restFilter,
            id: packageIds,
          };
        } else {
          // No overdue installments, return empty result
          params.filter = {
            ...restFilter,
            id: [], // Empty array will return no results
          };
        }
      } catch (error) {
        logger.error("Error filtering overdue installments", { error });
        // Fall through to normal filtering
      }
    }
    
    const lastSeenRanges =
      params.filter && Array.isArray((params.filter as any).last_seen_ranges)
        ? ((params.filter as any).last_seen_ranges as RangeFilter[])
        : [];
    if (params.filter && "last_seen_ranges" in params.filter) {
      delete (params.filter as any).last_seen_ranges;
    }
    
    // Clean up invalid @or filters that might cause parsing errors
    if (params.filter && params.filter["@or"] && typeof params.filter["@or"] === "object") {
      const orFilter = params.filter["@or"];
      // Check if @or has invalid keys (like services_interested.cs_5.{5} or malformed syntax)
      const hasInvalidKeys = Object.keys(orFilter).some(key => 
        key.includes(".") && (key.includes("cs_") || key.match(/\.\d+\./) || key.includes("services_interested.cs"))
      );
      
      if (hasInvalidKeys) {
        // Remove invalid @or filter entirely
        delete params.filter["@or"];
        // If @or was the only filter, ensure we don't have an empty filter object causing issues
        if (Object.keys(params.filter).length === 0) {
          params.filter = undefined;
        }
      }
    }
    
    // Handle lead_stage filter for contacts resource - filter contacts by their deal stage (single or multi)
    if (
      (resource === "contacts" || resource === "clients") &&
      params.filter &&
      ("lead_stage" in params.filter || "lead_stage@in" in params.filter)
    ) {
      const stageValues: string[] = [];
      if ("lead_stage" in params.filter) {
        stageValues.push(params.filter.lead_stage as string);
        delete params.filter.lead_stage;
      }
      if ("lead_stage@in" in params.filter) {
        stageValues.push(
          ...parseInList(params.filter["lead_stage@in"] as string),
        );
        delete params.filter["lead_stage@in"];
      }

      if (stageValues.length > 0) {
        const dealsFilter =
          stageValues.length === 1
            ? { stage: stageValues[0] }
            : { "stage@in": `(${stageValues.join(",")})` };

        const { data: dealsWithStage } = await baseDataProvider.getList(
          "deals",
          {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "id", order: "ASC" },
            filter: dealsFilter,
          },
        );

        const contactIds = Array.from(
          new Set(
            dealsWithStage
              ?.flatMap((deal: Deal) => {
                if (deal.lead_id != null) return [deal.lead_id];
                if (Array.isArray((deal as any).contact_ids)) {
                  return (deal as any).contact_ids.filter(
                    (id: Identifier | undefined) =>
                      id !== undefined && id !== null,
                  );
                }
                return [];
              })
              .filter(
                (id: Identifier | undefined): id is Identifier =>
                  id !== undefined && id !== null,
              ),
          ),
        );

        if (contactIds.length > 0) {
          params.filter["id@in"] = mergeIdInFilters(
            params.filter["id@in"],
            contactIds,
          );
        } else {
          params.filter["id@in"] = "(-1)";
        }
      }
    }
    
    // Handle client filters (active/archived) based on converted deals
    if (resource === "clients" && params.filter) {
      const hasArchivedDeals =
        "hasArchivedDeals" in params.filter
          ? params.filter.hasArchivedDeals
          : undefined;
      const hasIsClient = "isClient" in params.filter;

      // Clean up handled filters
      if (hasIsClient) {
        delete params.filter.isClient;
      }
      if ("hasArchivedDeals" in params.filter) {
        delete params.filter.hasArchivedDeals;
      }

      // Only run when explicitly filtering clients or archive state
      if (hasIsClient || typeof hasArchivedDeals === "boolean") {
        const dealFilter: any = { stage: "converted" };

        // Default client view and explicit "unarchived" both limit to active deals
        if (hasArchivedDeals === true) {
          dealFilter["archived_at@not.is"] = null;
        } else {
          dealFilter["archived_at@is"] = null;
        }

        const { data: convertedDeals } = await baseDataProvider.getList("deals", {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "id", order: "ASC" },
          filter: dealFilter,
        });

        if (!convertedDeals || convertedDeals.length === 0) {
          params.filter["id@in"] = "(-1)";
        } else {
          // Extract unique lead_ids (contact IDs) from converted deals, falling back to legacy contact_ids array
          const clientContactIds = Array.from(
            new Set(
              convertedDeals
                .flatMap((deal: Deal) => {
                  if (deal.lead_id != null) return [deal.lead_id];
                  if (Array.isArray((deal as any).contact_ids)) {
                    return (deal as any).contact_ids.filter(
                      (id: Identifier | undefined) =>
                        id !== undefined && id !== null,
                    );
                  }
                  return [];
                })
                .filter((id: Identifier | undefined): id is Identifier => id !== undefined && id !== null),
            ),
          );

          if (clientContactIds.length > 0) {
            params.filter["id@in"] = `(${clientContactIds.join(",")})`;
          } else {
            params.filter["id@in"] = "(-1)";
          }
        }
      }
    }
    
    // Handle services_interested filters for contacts - only when a services filter is explicitly selected by the user
    // CRITICAL: By default, show ALL leads (with and without services_interested)
    if ((resource === "contacts" || resource === "contacts_summary") && params.filter) {
      const isEmptySetString = (val: unknown) =>
        typeof val !== "string" ||
        val.trim() === "" ||
        val.replace(/[{}\s,]/g, "") === "";

      // Remove null/undefined/empty-string filters to avoid accidental filtering
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
          delete params.filter![key];
        }
      });
      if (params.filter["@or"] && typeof params.filter["@or"] === "object") {
        const cleanedOr = Object.fromEntries(
          Object.entries(params.filter["@or"]).filter(([, value]) => {
            if (value === null || value === undefined) return false;
            if (typeof value === "string" && value.trim() === "") return false;
            return true;
          }),
        );
        if (Object.keys(cleanedOr).length === 0) {
          delete params.filter["@or"];
        } else {
          params.filter["@or"] = cleanedOr;
        }
      }

      // Clean up empty/invalid services filters (both @cs and @ov) so they don't accidentally filter out leads
      const serviceKeys = ["services_interested@cs", "services_interested@ov"];
      serviceKeys.forEach((key) => {
        if (key in params.filter && isEmptySetString(params.filter[key])) {
          delete params.filter[key];
        }
      });

      if (params.filter["@or"] && typeof params.filter["@or"] === "object") {
        const cleanedOr = Object.fromEntries(
          Object.entries(params.filter["@or"]).filter(([key, value]) => {
            if (
              !key.startsWith("services_interested@cs") &&
              !key.startsWith("services_interested@ov")
            )
              return true;
            return !isEmptySetString(value);
          }),
        );
        if (Object.keys(cleanedOr).length === 0) {
          delete params.filter["@or"];
        } else {
          params.filter["@or"] = cleanedOr;
        }
      }

      // Check if there's actually a services_interested filter
      const hasServicesFilter = !!(
        (params.filter["services_interested@cs"] &&
          !isEmptySetString(params.filter["services_interested@cs"])) ||
        (params.filter["services_interested@ov"] &&
          !isEmptySetString(params.filter["services_interested@ov"])) ||
        (params.filter["@or"] &&
          typeof params.filter["@or"] === "object" &&
          Object.keys(params.filter["@or"]).some(
            (key) =>
              (key.startsWith("services_interested@cs") ||
                key.startsWith("services_interested@ov")) &&
              !isEmptySetString((params.filter as any)["@or"][key]),
          ))
      );
      
      // Only process services filter logic if there's actually a services filter
      // If no services filter is present, skip this entire block - this ensures ALL contacts are shown
      // including those without any services_interested (NULL or empty array)
      if (hasServicesFilter) {
        // Check if there are multiple services_interested@cs filters in @or
        if (params.filter["@or"] && typeof params.filter["@or"] === "object") {
          const orFilter = params.filter["@or"];
          const serviceFilters: string[] = [];
          
          // Extract all services_interested@cs filters from @or
          Object.entries(orFilter).forEach(([key, value]) => {
            if (key === "services_interested@cs" || key.startsWith("services_interested@cs")) {
              if (typeof value === "string") {
                serviceFilters.push(value);
              }
            }
          });
          
          // If we found multiple service filters, handle them
          if (serviceFilters.length > 0) {
            // Remove the @or filter temporarily
            const cleanedOr = Object.fromEntries(
              Object.entries(orFilter).filter(
                ([key]) => !key.startsWith("services_interested@cs")
              )
            );
            
            if (Object.keys(cleanedOr).length === 0) {
              delete params.filter["@or"];
            } else {
              params.filter["@or"] = cleanedOr;
            }
            
            // Fetch contacts for each service and combine results
            const allContactIds = new Set<Identifier>();
            
            for (const serviceFilter of serviceFilters) {
              const serviceIdMatch = serviceFilter?.match(/\{(\d+)\}/);
              if (serviceIdMatch) {
                const { data: contacts } = await baseDataProvider.getList("contacts_summary", {
                  pagination: { page: 1, perPage: 1000 },
                  sort: { field: "id", order: "ASC" },
                  filter: { "services_interested@cs": serviceFilter },
                });
                
                contacts?.forEach((c: any) => allContactIds.add(c.id));
              }
            }
            
            // Apply id@in filter with all matching contact IDs
            if (allContactIds.size > 0) {
              const contactIdsArray = Array.from(allContactIds);
              // If there's already an id@in filter, intersect them
              if (params.filter["id@in"]) {
                const existingIds = params.filter["id@in"]
                  .replace(/[()]/g, "")
                  .split(",")
                  .map((id: string) => parseInt(id.trim()))
                  .filter((id: number) => !isNaN(id));
                
                const intersection = existingIds.filter((id: number) => contactIdsArray.includes(id));
                
                if (intersection.length > 0) {
                  params.filter["id@in"] = `(${intersection.join(",")})`;
                } else {
                  params.filter["id@in"] = "(-1)";
                }
              } else {
                params.filter["id@in"] = `(${contactIdsArray.join(",")})`;
              }
            } else {
              // No contacts match, return empty result
              params.filter["id@in"] = "(-1)";
            }
          }
        }
        
        // Also handle single services_interested@cs filter (not in @or)
        if (params.filter["services_interested@cs"] && !params.filter["@or"]) {
          const servicesFilter = params.filter["services_interested@cs"];
          delete params.filter["services_interested@cs"];
          
          const serviceIdMatch = servicesFilter?.match(/\{(\d+)\}/);
          if (serviceIdMatch) {
            // Fetch contacts that have this service
            const { data: contacts } = await baseDataProvider.getList("contacts_summary", {
              pagination: { page: 1, perPage: 1000 },
              sort: { field: "id", order: "ASC" },
              filter: { "services_interested@cs": servicesFilter },
            });
            
            const contactIds = contacts?.map((c: any) => c.id) || [];
            
            if (contactIds.length > 0) {
              // If there's already an id@in filter, intersect them
              if (params.filter["id@in"]) {
                const existingIds = params.filter["id@in"]
                  .replace(/[()]/g, "")
                  .split(",")
                  .map((id: string) => parseInt(id.trim()))
                  .filter((id: number) => !isNaN(id));
                
                const intersection = existingIds.filter((id: number) => contactIds.includes(id));
                
                if (intersection.length > 0) {
                  params.filter["id@in"] = `(${intersection.join(",")})`;
                } else {
                  params.filter["id@in"] = "(-1)";
                }
              } else {
                params.filter["id@in"] = `(${contactIds.join(",")})`;
              }
            } else {
              params.filter["id@in"] = "(-1)";
            }
          }
        }
      }
    }
    
    // Handle services_interested filter for lead-journey (deals) - filter through lead_id relationship
    if (resource === "lead-journey" && params.filter && "services_interested@cs" in params.filter) {
      const servicesFilter = params.filter["services_interested@cs"];
      delete params.filter["services_interested@cs"];
      
      // Extract service ID from filter (format: {serviceId})
      const serviceIdMatch = servicesFilter?.match(/\{(\d+)\}/);
      if (serviceIdMatch) {
        // First, fetch contacts that have this service
        const { data: contacts } = await baseDataProvider.getList("contacts_summary", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "id", order: "ASC" },
          filter: { "services_interested@cs": servicesFilter },
        });
        
        // Extract contact IDs and format as string for @in filter: "(1,2,3)"
        const contactIds = contacts?.map((c: any) => c.id) || [];
        
        // Filter deals by lead_id in those contact IDs, and fallback to legacy contact_ids array
        if (contactIds.length > 0) {
          // Primary filter using lead_id
          params.filter["lead_id@in"] = `(${contactIds.join(",")})`;
          // Legacy fallback: ensure we also match deals where the contact is stored in contact_ids
          params.filter["@or"] = {
            "lead_id@in": params.filter["lead_id@in"],
            "contact_ids@cs": `{${contactIds.join(",")}}`,
          };
        } else {
          // No contacts match, return empty result by using a non-existent ID
          params.filter["lead_id@in"] = "(-1)";
        }
      }
    }
    
    // Ensure params.filter is always an object (not undefined) for the base provider
    // Empty filter objects are fine - they won't filter anything
    if (!params.filter) {
      params.filter = {};
    }

    // Apply multi-range last_seen filters (union of matching IDs) after all other filters are in place
    if (
      lastSeenRanges.length > 0 &&
      (mappedResource === "contacts_summary" ||
        resource === "contacts" ||
        resource === "clients")
    ) {
      const ids = await collectIdsForRanges(
        mappedResource,
        lastSeenRanges,
        params.filter,
      );
      params.filter["id@in"] =
        ids.size > 0
          ? mergeIdInFilters(params.filter["id@in"], ids)
          : "(-1)";
    }
    
    return baseDataProvider.getList(mappedResource, params);
  },
  async getOne(resource: string, params: any) {
    const mappedResource = mapResourceName(resource);
    return baseDataProvider.getOne(mappedResource, params);
  },
  async create(resource: string, params: any) {
    // For creates, use the base table instead of the view
    let mappedResource = mapResourceName(resource);
    if (mappedResource === "contacts_summary") {
      mappedResource = "contacts";
    }
    if (mappedResource === "companies_summary") {
      mappedResource = "companies";
    }
    
    // Clean up tagged_user_ids for tasks to avoid schema cache issues
    if (mappedResource === "tasks" && params.data) {
      const cleanedData = { ...params.data };
      // Only include tagged_user_ids if it's a valid non-empty array
      // Otherwise, completely remove it to avoid Supabase schema cache errors
      if (!Array.isArray(cleanedData.tagged_user_ids) || cleanedData.tagged_user_ids.length === 0) {
        delete cleanedData.tagged_user_ids;
      }
      return baseDataProvider.create(mappedResource, { ...params, data: cleanedData });
    }
    
    // Handle recurring appointments
    if (mappedResource === "appointments" && params.data) {
      const appointmentData = { ...params.data };
      const staffIds = appointmentData.staff_ids || [];
      delete appointmentData.staff_ids; // Remove staff_ids as it's not a column
      
      // Check if this is a recurring appointment
      if (appointmentData.is_recurring && appointmentData.recurrence_config) {
        // Import recurrence utilities dynamically to avoid circular dependencies
        const { generateRecurringAppointments } = await import("../../appointments/recurrenceUtils");
        
        // Generate UUID for recurrence_id
        const recurrenceId = crypto.randomUUID();
        
        // Prepare base appointment data for generation
        // Include payment_package_id so it propagates to all recurring instances
        const baseAppointment = {
          patient_id: appointmentData.patient_id,
          appointment_date: appointmentData.appointment_date,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          duration_minutes: appointmentData.duration_minutes,
          appointment_type: appointmentData.appointment_type,
          status: appointmentData.status || "scheduled",
          notes: appointmentData.notes || null,
          mini_notes: appointmentData.mini_notes || null,
          full_notes: appointmentData.full_notes || null,
          pickup_instructions: appointmentData.pickup_instructions || null,
          primary_staff_id: appointmentData.primary_staff_id || null,
          driver_id: appointmentData.driver_id || null,
          payment_package_id: appointmentData.payment_package_id || null,
        };
        
        // Generate all appointment instances
        const generatedAppointments = generateRecurringAppointments(
          baseAppointment,
          appointmentData.recurrence_config
        );
        logger.debug(`Generated ${generatedAppointments.length} recurring appointments`, {
          config: appointmentData.recurrence_config,
          count: generatedAppointments.length,
        });
        
        // Create parent appointment (sequence 0) with recurrence_config
        const parentData = {
          ...baseAppointment,
          ...generatedAppointments[0],
          recurrence_id: recurrenceId,
          recurrence_config: appointmentData.recurrence_config,
          is_recurring: true,
          recurrence_sequence: 0,
        };
        
        const parentResult = await baseDataProvider.create(mappedResource, {
          ...params,
          data: parentData,
        });
        
        const parentId = parentResult.id;
        
        // Create staff assignments for parent
        if (staffIds.length > 0) {
          for (const staffId of staffIds) {
            try {
              await baseDataProvider.create("appointment_staff_assignments", {
                data: {
                  appointment_id: parentId,
                  staff_id: staffId,
                  role: "other",
                },
              });
            } catch (staffError) {
              logger.warn("Error creating staff assignment for parent", { error: staffError });
            }
          }
        }
        
        // Log activity for parent appointment
        try {
          const { data: contact } = await supabase
            .from("contacts")
            .select("sales_id")
            .eq("id", appointmentData.patient_id)
            .maybeSingle();
          
          await supabase.from("activity_log").insert({
            type: "appointment.created",
            appointment_id: parentId,
            contact_id: appointmentData.patient_id,
            sales_id: contact?.sales_id || null,
            date: new Date().toISOString(),
          });
        } catch (activityError) {
          logger.warn("Error logging parent appointment activity", { error: activityError });
        }
        
        // Create child appointments (sequence 1+)
        const childResults = [];
        for (let i = 1; i < generatedAppointments.length; i++) {
          const childData = {
            ...generatedAppointments[i],
            recurrence_id: recurrenceId,
            is_recurring: true,
            recurrence_sequence: i,
            // Don't include recurrence_config on children
          };
          
          try {
            const childResult = await baseDataProvider.create(mappedResource, {
              ...params,
              data: childData,
            });
            
            const childId = childResult.id;
            childResults.push(childResult);
            
            // Create staff assignments for child
            if (staffIds.length > 0) {
              for (const staffId of staffIds) {
                try {
                  await baseDataProvider.create("appointment_staff_assignments", {
                    data: {
                      appointment_id: childId,
                      staff_id: staffId,
                      role: "other",
                    },
                  });
                } catch (staffError) {
                  logger.warn("Error creating staff assignment for child", { error: staffError });
                }
              }
            }
            
            // Log activity for child appointment
            try {
              const { data: contact } = await supabase
                .from("contacts")
                .select("sales_id")
                .eq("id", appointmentData.patient_id)
                .maybeSingle();
              
              await supabase.from("activity_log").insert({
                type: "appointment.created",
                appointment_id: childId,
                contact_id: appointmentData.patient_id,
                sales_id: contact?.sales_id || null,
                date: new Date().toISOString(),
              });
            } catch (activityError) {
              logger.warn("Error logging child appointment activity", { error: activityError });
            }
          } catch (childError) {
            logger.error(`Error creating child appointment ${i}`, childError, { context: "dataProvider" });
            // Continue creating other children even if one fails
          }
        }
        
        // Return parent result with metadata about children
        return {
          ...parentResult,
          meta: {
            ...parentResult.meta,
            childrenCreated: childResults.length,
            totalCreated: childResults.length + 1,
          },
        };
      } else {
        // Non-recurring appointment - create as normal but log activity
        const result = await baseDataProvider.create(mappedResource, {
          ...params,
          data: appointmentData,
        });
        
        // Create staff assignments
        if (staffIds.length > 0) {
          for (const staffId of staffIds) {
            try {
              await baseDataProvider.create("appointment_staff_assignments", {
                data: {
                  appointment_id: result.id,
                  staff_id: staffId,
                  role: "other",
                },
              });
            } catch (staffError) {
              logger.warn("Error creating staff assignment", { error: staffError });
            }
          }
        }
        
        // Log activity for appointment creation
        try {
          const { data: contact } = await supabase
            .from("contacts")
            .select("sales_id")
            .eq("id", appointmentData.patient_id)
            .maybeSingle();
          
          await supabase.from("activity_log").insert({
            type: "appointment.created",
            appointment_id: result.id,
            contact_id: appointmentData.patient_id,
            sales_id: contact?.sales_id || null,
            date: new Date().toISOString(),
          });
        } catch (activityError) {
          logger.warn("Error logging appointment activity", { error: activityError });
        }
        
        return result;
      }
    }
    
    return baseDataProvider.create(mappedResource, params);
  },
  async update(resource: string, params: UpdateParams<RaRecord>) {
    // For updates, use the base table instead of the view
    // Views cannot be updated, so we need to update the actual table
    let mappedResource = mapResourceName(resource);
    if (mappedResource === "contacts_summary") {
      mappedResource = "contacts";
    }
    if (mappedResource === "companies_summary") {
      mappedResource = "companies";
    }
    
    // Check if this is a deal/lead-journey update
    if ((mappedResource === "deals" || resource === "lead-journey") && params.data) {
      // Fetch the previous data to compare changes
      const { data: previousDeal } = await supabase
        .from("deals")
        .select("stage, sales_id, company_id, lead_id, contact_ids, archived_at")
        .eq("id", params.id)
        .maybeSingle();
      
      if (previousDeal) {
        // Check if stage is changing
        if ("stage" in params.data && previousDeal.stage !== params.data.stage) {
          try {
            const activityData: Record<string, unknown> = {
              type: "deal.statusChanged",
              deal_id: params.id,
              sales_id: previousDeal.sales_id || params.data.sales_id || null,
              date: new Date().toISOString(),
            };
            
            // Try to include new columns (will fail gracefully if migration hasn't run)
            const activityDataWithNewColumns = {
              ...activityData,
              company_id: previousDeal.company_id || params.data.company_id || null,
              old_stage: previousDeal.stage || null,
              new_stage: params.data.stage || null,
            };
            
            const { error: insertError } = await supabase
              .from("activity_log")
              .insert(activityDataWithNewColumns);
            
            // If insert failed (likely because columns don't exist), try without new columns
            if (insertError) {
              const { error: fallbackError } = await supabase
                .from("activity_log")
                .insert(activityData);
              
              if (fallbackError) {
                logger.warn("Failed to log status change to activity_log. Please run migration 20250208000000_add_status_change_tracking.sql", { error: fallbackError });
              }
            }
          } catch (error) {
            logger.warn("Error logging status change", { error });
          }
        }
        
        // Check if archived_at is changing (archive/unarchive)
        if ("archived_at" in params.data) {
          const wasArchived = previousDeal.archived_at != null;
          const willBeArchived = params.data.archived_at != null;
          
          // Only log if the archive status is actually changing
          if (wasArchived !== willBeArchived) {
            try {
              const activityData: Record<string, unknown> = {
                type: willBeArchived ? "deal.archived" : "deal.unarchived",
                deal_id: params.id,
                sales_id: previousDeal.sales_id || params.data.sales_id || null,
                date: new Date().toISOString(),
              };
              
              // Try to include company_id if migration has been run
              const activityDataWithCompany = {
                ...activityData,
                company_id: previousDeal.company_id || params.data.company_id || null,
              };
              
              const { error: insertError } = await supabase
                .from("activity_log")
                .insert(activityDataWithCompany);
              
              if (insertError) {
                // Try without company_id if it fails
                const { error: fallbackError } = await supabase
                  .from("activity_log")
                  .insert(activityData);
                
                if (fallbackError) {
                  logger.warn("Failed to log archive/unarchive to activity_log", { error: fallbackError });
                }
              }
            } catch (error) {
              logger.warn("Error logging archive/unarchive", { error });
            }
          }
        }
      }
    }
    
    // Handle recurring appointment updates
    if (mappedResource === "appointments" && params.data && params.id) {
      const updateFutureOnly = (params.meta as any)?.updateFutureOnly || false;
      
      // Fetch the current appointment to check if it's recurring
      const { data: currentAppointment } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      
      if (currentAppointment) {
        const isRecurring = currentAppointment.is_recurring || currentAppointment.recurrence_id;
        
        if (isRecurring && updateFutureOnly) {
          // Update this appointment and all future appointments in the series
          const recurrenceId = currentAppointment.recurrence_id;
          const appointmentStartTime = currentAppointment.start_time;
          
          // Find all appointments with same recurrence_id and start_time >= this appointment's start_time
          const { data: futureAppointments } = await supabase
            .from("appointments")
            .select("id, patient_id, start_time, appointment_type")
            .eq("recurrence_id", recurrenceId)
            .gte("start_time", appointmentStartTime);
          
          const appointmentsToUpdate = futureAppointments || [];
          
          // Prepare update data - preserve dates, only update other fields
          const updateData: Record<string, any> = { ...params.data };
          
          // For each future appointment, preserve its original date but update other fields
          for (const futureAppt of appointmentsToUpdate) {
            // Get the original date/time for this appointment
            const originalStartTime = futureAppt.start_time;
            const originalEndTime = futureAppt.end_time;
            const originalDate = originalStartTime ? originalStartTime.split("T")[0] : null;
            
            // Extract time from the update data (if provided)
            let newStartTime = updateData.start_time;
            let newEndTime = updateData.end_time;
            
            if (newStartTime && originalDate) {
              // Preserve the original date, but use the new time
              const timePart = newStartTime.includes("T") ? newStartTime.split("T")[1] : newStartTime;
              newStartTime = `${originalDate}T${timePart}`;
            } else if (originalStartTime) {
              // Keep original time if no new time provided
              newStartTime = originalStartTime;
            }
            
            if (newEndTime && originalDate) {
              // Preserve the original date, but use the new time
              const timePart = newEndTime.includes("T") ? newEndTime.split("T")[1] : newEndTime;
              newEndTime = `${originalDate}T${timePart}`;
            } else if (originalEndTime) {
              // Keep original time if no new time provided
              newEndTime = originalEndTime;
            }
            
            // Create update data with preserved date
            const futureUpdateData: Record<string, any> = {
              ...updateData,
              appointment_date: originalDate || updateData.appointment_date,
              start_time: newStartTime || updateData.start_time,
              end_time: newEndTime || updateData.end_time,
            };
            
            // Remove staff_ids from update data - it's handled separately
            delete futureUpdateData.staff_ids;
            
            // Update this future appointment
            try {
              await baseDataProvider.update(mappedResource, {
                id: futureAppt.id,
                data: futureUpdateData,
                previousData: futureAppt as any,
              });
            } catch (updateError) {
              logger.error(`Error updating future appointment ${futureAppt.id}`, updateError, { context: "dataProvider" });
              // Continue updating other appointments even if one fails
            }
          }
          
          // Store future appointment IDs for staff assignment handling
          const futureAppointmentIds = appointmentsToUpdate.map(apt => apt.id);
          
          // Update the current appointment and return result with future appointment IDs
          const result = await baseDataProvider.update(mappedResource, params);
          
          // Add future appointment IDs to the result
          return {
            ...result,
            meta: {
              ...result.meta,
              futureAppointmentIds,
            },
          };
        }
      }
    }
    
    return baseDataProvider.update(mappedResource, params);
  },
  async delete(resource: string, params: { id: Identifier; meta?: { deleteFutureOnly?: boolean } }) {
    // Handle sales deletion through Edge Function to delete auth user
    if (resource === "sales") {
      return this.salesDelete(params.id);
    }
    
    // For deletes, use the base table instead of the view
    let mappedResource = mapResourceName(resource);
    if (mappedResource === "contacts_summary") {
      mappedResource = "contacts";
    }
    if (mappedResource === "companies_summary") {
      mappedResource = "companies";
    }
    
    // Try to fetch the record first (using maybeSingle to avoid 406 if not found)
    // If fetch fails, we'll still try to delete
    let record: Record<string, unknown> | null = null;
    const { data: fetchedRecord } = await supabase
      .from(mappedResource)
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    
    record = fetchedRecord;

    // Handle recurring appointment deletion
    if (mappedResource === "appointments" && record) {
      const deleteFutureOnly = params.meta?.deleteFutureOnly || false;
      const isRecurring = record.is_recurring || record.recurrence_id;
      
      if (isRecurring && deleteFutureOnly) {
        // Delete this appointment and all future appointments in the series
        const recurrenceId = record.recurrence_id;
        const appointmentStartTime = record.start_time;
        
        // Find all appointments with same recurrence_id and start_time >= this appointment's start_time
        const { data: futureAppointments } = await supabase
          .from("appointments")
          .select("id, patient_id, start_time, appointment_type")
          .eq("recurrence_id", recurrenceId)
          .gte("start_time", appointmentStartTime);
        
        const appointmentsToDelete = futureAppointments || [];
        
        // Delete staff assignments and log activities for each appointment
        for (const apt of appointmentsToDelete) {
          try {
            // Delete staff assignments
            const { data: assignments } = await supabase
              .from("appointment_staff_assignments")
              .select("id")
              .eq("appointment_id", apt.id);
            
            for (const assignment of assignments || []) {
              await supabase
                .from("appointment_staff_assignments")
                .delete()
                .eq("id", assignment.id);
            }
            
            // Log deletion activity
            try {
              const { data: contact } = await supabase
                .from("contacts")
                .select("sales_id")
                .eq("id", apt.patient_id)
                .maybeSingle();
              
              await supabase.from("activity_log").insert({
                type: "appointment.deleted",
                appointment_id: apt.id,
                contact_id: apt.patient_id,
                sales_id: contact?.sales_id || null,
                appointment_date: apt.start_time ? apt.start_time.split("T")[0] : null,
                appointment_type: apt.appointment_type || null,
                date: new Date().toISOString(),
              });
            } catch (activityError) {
              logger.warn("Error logging appointment deletion activity", { error: activityError });
            }
            
            // Delete the appointment
            await supabase
              .from("appointments")
              .delete()
              .eq("id", apt.id);
          } catch (error) {
            logger.error(`Error deleting appointment ${apt.id}`, error, { context: "dataProvider" });
            // Continue deleting other appointments even if one fails
          }
        }
        
        // Return the deleted record
        return { data: record };
      }
      // For single appointment deletion, continue to normal deletion flow below
      // (activity logging will happen in the general deletion section)
    }

    // If a contact is deleted, also archive any related Lead Journey items (deals)
    // so they stop showing as cards after the FK sets lead_id to NULL.
    if (mappedResource === "contacts" && params?.id != null) {
      const contactId = params.id;
      const now = new Date().toISOString();
      try {
        // Primary relation (new schema): deals.lead_id
        await supabase
          .from("deals")
          .update({ archived_at: now, updated_at: now })
          .eq("lead_id", contactId);

        // Legacy relation (older schema): deals.contact_ids array
        // Best-effort: if column doesn't exist or update is blocked, we ignore.
        await supabase
          .from("deals")
          .update({ archived_at: now, updated_at: now })
          // PostgREST array contains operator
          .contains("contact_ids", [contactId] as any);
      } catch {
        // Best effort only; deletion should still proceed.
      }
    }
    
    // For contacts, archive instead of deleting
    if (mappedResource === "contacts" && record) {
      const now = new Date().toISOString();
      const { error: archiveError } = await supabase
        .from("contacts")
        .update({ archived_at: now })
        .eq("id", params.id);
      
      if (archiveError) {
        throw archiveError;
      }
      
      // Return the archived record
      return { data: { ...record, archived_at: now } };
    }
    
    // Create deletion activity before deleting
    if (record) {
      const activityData: Record<string, unknown> = {
        date: new Date().toISOString(),
        sales_id: record.sales_id || null,
      };

      if (mappedResource === "contactNotes" || mappedResource === "dealNotes") {
        // Note deletion
        activityData.type = "note.deleted";
        activityData.note_text = record.text || null;
        if (mappedResource === "contactNotes") {
          activityData.contact_id = record.contact_id || null;
        } else if (mappedResource === "dealNotes") {
          activityData.deal_id = record.deal_id || null;
          // For deal notes, try to get contact_id from the deal if possible
          // This is a best-effort approach - if deal is already deleted, contact_id won't be available
          if (record.deal_id) {
            const { data: deal } = await supabase
              .from("deals")
              .select("lead_id, contact_ids")
              .eq("id", record.deal_id)
              .maybeSingle();
            if (deal) {
              activityData.contact_id = deal.lead_id || (Array.isArray(deal.contact_ids) ? deal.contact_ids[0] : null);
            }
          }
        }
      } else if (mappedResource === "quotes") {
        // Quote deletion
        activityData.type = "quote.deleted";
        activityData.contact_id = record.contact_id || null;
        activityData.quote_amount = record.amount || null;
        activityData.quote_description = record.description || null;
      } else if (mappedResource === "tasks") {
        // Task deletion
        activityData.type = "task.deleted";
        activityData.contact_id = record.contact_id || null;
        activityData.task_text = record.text || null;
        activityData.task_type = record.type || null;
      } else if (mappedResource === "appointments") {
        // Appointment deletion (single appointment, not handled above)
        // Skip if we already handled it in the recurring appointment section
        if (!record.is_recurring || !params.meta?.deleteFutureOnly) {
          activityData.type = "appointment.deleted";
          activityData.appointment_id = record.id;
          activityData.contact_id = record.patient_id || null;
          activityData.appointment_date = record.appointment_date || null;
          activityData.appointment_type = record.appointment_type || null;
        }
      }

      // Only create activity log entry if it's a note, quote, task, or appointment
      if (activityData.type) {
        await supabase.from("activity_log").insert(activityData);
      }
    }
    
    // Use Supabase client directly to perform the delete
    // This avoids the 406 error from the REST API
    const { error: deleteError } = await supabase
      .from(mappedResource)
      .delete()
      .eq("id", params.id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // Return the deleted record in the format expected by react-admin
    // If we couldn't fetch it, return at least the ID
    return { data: record || { id: params.id } };
  },
  async getMany(resource: string, params: any) {
    const mappedResource = mapResourceName(resource);
    return baseDataProvider.getMany(mappedResource, params);
  },
  async getManyReference(resource: string, params: any) {
    const mappedResource = mapResourceName(resource);
    return baseDataProvider.getManyReference(mappedResource, params);
  },

  async signUp({ email, password, first_name, last_name }: SignUpData) {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    if (!response.data?.user || response.error) {
      logger.error("signUp.error", response.error, { context: "dataProvider" });
      throw new Error("Failed to create account");
    }

    // Update the is initialized cache
    getIsInitialized._is_initialized_cache = true;

    return {
      id: response.data.user.id,
      email,
      password,
    };
  },
  async salesCreate(body: SalesFormData) {
    const { data, error } = await supabase.functions.invoke<{ data: Sale }>("users", {
      method: "POST",
      body,
    });

    if (error) {
      // Log the full error object for debugging
      const errorAny = error as any;
      console.error("salesCreate.error - Full error object:", {
        error,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorAny,
        context: errorAny?.context,
        status: errorAny?.context?.status,
        response: errorAny?.context?.response,
      });
      
      logger.error("salesCreate.error", error, { 
        context: "dataProvider",
        errorDetails: errorAny,
      });
      
      // Try to extract error message from the error response
      let errorMessage = "Failed to create account manager";
      
      // FunctionsHttpError structure: error.context contains response info
      if (errorAny?.context) {
        const context = errorAny.context;
        
        // Try to get message from context directly
        if (context?.message) {
          errorMessage = context.message;
        }
        
        // Check status codes
        if (context?.status === 401) {
          errorMessage = "You do not have permission to create users. Administrator access required.";
        } else if (context?.status === 400) {
          errorMessage = context?.message || "Invalid request. Please check all required fields are filled.";
        } else if (context?.status === 500) {
          errorMessage = context?.message || "Server error occurred while creating user. Please try again.";
        }
      }
      
      // Try to extract from error message if it contains JSON
      if (error instanceof Error && error.message) {
        try {
          // Look for JSON in the error message
          const jsonMatch = error.message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.message) {
              errorMessage = parsed.message;
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
      
      throw new Error(errorMessage);
    }

    if (!data) {
      logger.error("salesCreate.error", "No data returned", { context: "dataProvider" });
      throw new Error("Failed to create account manager: No data returned");
    }

    // Edge Function returns { data: sale }, so extract the sale object
    return data.data || data;
  },
  async salesUpdate(
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) {
    const { email, first_name, last_name, administrator, avatar, disabled } =
      data;

    const { data: sale, error } = await supabase.functions.invoke<Sale>(
      "users",
      {
        method: "PATCH",
        body: {
          sales_id: id,
          email,
          first_name,
          last_name,
          administrator,
          disabled,
          avatar,
        },
      },
    );

    if (!sale || error) {
      logger.error("salesUpdate.error", error, { context: "dataProvider" });
      throw new Error("Failed to update account manager");
    }

    return data;
  },
  async salesDelete(id: Identifier) {
    const { error } = await supabase.functions.invoke<{ message: string }>(
      "users",
      {
        method: "DELETE",
        body: {
          sales_id: id,
        },
      },
    );

    if (error) {
      logger.error("salesDelete.error", error, { context: "dataProvider", id });
      
      // Try to extract error message from the error response
      let errorMessage = "Failed to delete user";
      const errorAny = error as any;
      
      // Log the full error structure for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("Full error object:", JSON.stringify(errorAny, null, 2));
      }
      
      // Try to extract from error context
      if (errorAny?.context) {
        const context = errorAny.context;
        if (context?.message) {
          errorMessage = context.message;
        } else if (context?.status === 401) {
          errorMessage = "You do not have permission to delete users. Administrator access required.";
        } else if (context?.status === 400) {
          errorMessage = "Cannot delete your own account";
        } else if (context?.status === 404) {
          errorMessage = "User not found";
        } else if (context?.status === 500) {
          errorMessage = "Server error occurred while deleting user. Please check the Edge Function logs.";
        }
      }
      
      // Try to extract from error message if it contains JSON
      if (error instanceof Error && error.message) {
        try {
          const match = error.message.match(/\{.*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.message) {
              errorMessage = parsed.message;
            } else if (parsed.status === 401) {
              errorMessage = "You do not have permission to delete users. Administrator access required.";
            } else if (parsed.status === 500) {
              errorMessage = parsed.message || "Server error occurred while deleting user. Please check the Edge Function logs.";
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
      
      throw new Error(errorMessage);
    }

    return { data: { id } };
  },
  async updatePassword(id: Identifier) {
    const { data: passwordUpdated, error } =
      await supabase.functions.invoke<boolean>("updatePassword", {
        method: "PATCH",
        body: {
          sales_id: id,
        },
      });

    if (!passwordUpdated || error) {
      logger.error("passwordUpdate.error", error, { context: "dataProvider" });
      throw new Error("Failed to update password");
    }

    return passwordUpdated;
  },
  async unarchiveDeal(deal: Deal) {
    // Log unarchive action before processing
    try {
      const activityData: Record<string, unknown> = {
        type: "deal.unarchived",
        deal_id: deal.id,
        sales_id: deal.sales_id || null,
        date: new Date().toISOString(),
      };
      
      // Try to include company_id if migration has been run
      const activityDataWithCompany = {
        ...activityData,
        company_id: deal.company_id || null,
      };
      
      const { error: insertError } = await supabase
        .from("activity_log")
        .insert(activityDataWithCompany);
      
      if (insertError) {
        // Try without company_id if it fails
        const { error: fallbackError } = await supabase
          .from("activity_log")
          .insert(activityData);
        
        if (fallbackError) {
          logger.warn("Failed to log unarchive to activity_log", { error: fallbackError });
        }
      }
    } catch (error) {
      logger.warn("Error logging unarchive", { error });
    }
    
    // get all deals where stage is the same as the deal to unarchive
    const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
      filter: { stage: deal.stage },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "index", order: "ASC" },
    });

    // set index for each deal starting from 1, if the deal to unarchive is found, set its index to the last one
    const updatedDeals = deals.map((d, index) => ({
      ...d,
      index: d.id === deal.id ? 0 : index + 1,
      archived_at: d.id === deal.id ? null : d.archived_at,
    }));

    return await Promise.all(
      updatedDeals.map((updatedDeal) =>
        baseDataProvider.update("deals", {
          id: updatedDeal.id,
          data: updatedDeal,
          previousData: deals.find((d) => d.id === updatedDeal.id),
        }),
      ),
    );
  },
  async getActivityLog(companyId?: Identifier, contactId?: Identifier) {
    return getActivityLog(baseDataProvider, companyId, undefined, contactId);
  },
  async isInitialized() {
    return getIsInitialized();
  },
  async mergeContacts(sourceId: Identifier, targetId: Identifier) {
    // FIXME this should be done in a lambda function using a transaction instead
    return mergeContacts(sourceId, targetId, baseDataProvider);
  },
  async getOverdueInstallments() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("installment_schedules")
        .select(`
          *,
          payment_packages!inner(*)
        `)
        .eq("is_paid", false)
        .lt("due_date", today)
        .order("due_date", { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        total: data?.length || 0,
      };
    } catch (error) {
      logger.error("getOverdueInstallments.error", error, { context: "dataProvider" });
      throw error;
    }
  },
  async linkAppointmentToPackage(appointmentId: Identifier, packageId: Identifier) {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({ payment_package_id: packageId })
        .eq("id", appointmentId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      logger.error("linkAppointmentToPackage.error", error, { context: "dataProvider", appointmentId, packageId });
      throw error;
    }
  },
  async getPackageUsage(packageId: Identifier) {
    // Alias for calculatePackageUsage for consistency
    return this.calculatePackageUsage(packageId);
  },
  async renewPackage(packageId: Identifier, newParams: any) {
    try {
      // Get the old package
      const { data: oldPackage, error: getError } = await supabase
        .from("payment_packages")
        .select("*")
        .eq("id", packageId)
        .single();

      if (getError || !oldPackage) throw getError || new Error("Package not found");

      // Create new package with new parameters
      const { data: newPackage, error: createError } = await supabase
        .from("payment_packages")
        .insert({
          ...oldPackage,
          ...newParams,
          id: undefined, // Let database generate new ID
          renewed_from_package_id: packageId,
          status: "active",
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Mark old package as completed
      const { error: updateError } = await supabase
        .from("payment_packages")
        .update({ status: "completed" })
        .eq("id", packageId);

      if (updateError) throw updateError;

      return { data: newPackage };
    } catch (error) {
      logger.error("renewPackage.error", error, { context: "dataProvider", packageId, newParams });
      throw error;
    }
  },
  async calculatePackageUsage(packageId: Identifier) {
    // Call the database function to calculate package usage
    const { data, error } = await supabase.rpc('calculate_package_usage', {
      package_id: packageId,
    });

    if (error) {
      logger.error("calculatePackageUsage.error", error, { context: "dataProvider", packageId });
      throw new Error(`Failed to calculate package usage: ${error.message}`);
    }

    // The function returns JSONB with sessions_used and hours_used
    return {
      sessionsUsed: Number(data?.sessions_used || 0),
      hoursUsed: Number(data?.hours_used || 0),
    };
  },
} satisfies DataProvider;

export type CrmDataProvider = typeof dataProviderWithCustomMethods;

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  [
    {
      resource: "contactNotes",
      beforeSave: async (data: ContactNote, _, __) => {
        return data;
      },
    },
    {
      resource: "dealNotes",
      beforeSave: async (data: DealNote, _, __) => {
        return data;
      },
    },
    {
      resource: "sales",
      beforeSave: async (data: Sale, _, __) => {
        if (data.avatar) {
          await uploadToBucket(data.avatar);
        }
        return data;
      },
    },
    {
      resource: "contacts",
      beforeCreate: async (params) => {
        return processContactAvatar(params);
      },
      beforeUpdate: async (params) => {
        return processContactAvatar(params);
      },
      beforeGetList: async (params) => {
        return applyFullTextSearch([
          "first_name",
          "last_name",
          "company_name",
          "title",
          "email",
          "phone",
          "background",
        ])(params);
      },
    },
    {
      resource: "staff",
      beforeGetList: async (params) => {
        return applyFullTextSearch([
          "first_name",
          "last_name",
          "email",
          "phone",
          "staff_type",
        ])(params);
      },
    },
    {
      resource: "companies",
      beforeGetList: async (params) => {
        return applyFullTextSearch([
          "name",
          "phone_number",
          "website",
          "zipcode",
          "city",
          "stateAbbr",
        ])(params);
      },
      beforeCreate: async (params) => {
        const createParams = await processCompanyLogo(params);

        return {
          ...createParams,
          data: {
            ...createParams.data,
            created_at: new Date().toISOString(),
          },
        };
      },
      beforeUpdate: async (params) => {
        return await processCompanyLogo(params);
      },
    },
    {
      resource: "contacts_summary",
      beforeGetList: async (params) => {
        return applyFullTextSearch([
          "first_name",
          "last_name",
          "email",
          "phone",
          "background",
          "area",
          "city",
          "flat_villa_number",
          "building_street",
        ])(params);
      },
    },
    {
      resource: "lead-journey",
      beforeGetList: async (params) => {
        return applyFullTextSearch(["name", "type", "description"])(params);
      },
    },
    {
      resource: "sales",
      beforeGetList: async (params) => {
        return applyFullTextSearch([
          "first_name",
          "last_name",
          "email",
        ], { useFtsSuffix: false })(params);
      },
    },
    {
      resource: "payment_transactions",
      afterCreate: async (result, dataProvider) => {
        const transaction = result.data;
        
        // If payment has installment_number, mark the corresponding installment as paid
        if (transaction.installment_number && transaction.payment_package_id) {
          try {
            // Find the installment schedule record
            const { data: installments } = await supabase
              .from("installment_schedules")
              .select("*")
              .eq("payment_package_id", transaction.payment_package_id)
              .eq("installment_number", transaction.installment_number)
              .eq("is_paid", false)
              .maybeSingle();

            if (installments) {
              // Check if amount matches (with some tolerance for rounding)
              const amountDifference = Math.abs(installments.amount_due - transaction.amount_received);
              const tolerance = 0.01; // Allow 1 cent difference for rounding

              if (amountDifference <= tolerance) {
                // Mark installment as paid
                await supabase
                  .from("installment_schedules")
                  .update({
                    is_paid: true,
                    paid_date: transaction.date_paid || transaction.date_received || new Date().toISOString().split("T")[0],
                  })
                  .eq("id", installments.id);

                logger.info(`Marked installment ${transaction.installment_number} as paid for package ${transaction.payment_package_id}`);
              } else {
                logger.warn(
                  `Payment amount (${transaction.amount_received}) doesn't match installment amount (${installments.amount_due}) for package ${transaction.payment_package_id}, installment ${transaction.installment_number}`
                );
              }
            }
          } catch (error) {
            logger.error(`Failed to mark installment as paid for transaction ${transaction.id}`, { error });
            // Don't throw - transaction is already created
          }
        }

        return result;
      },
    },
    {
      resource: "payment_packages",
      beforeGetList: async (params) => {
        // Remove empty search query - payment_packages doesn't have text search columns
        if (params.filter && "q" in params.filter) {
          const filter = params.filter as any;
          const q = filter.q;
          // Remove empty or whitespace-only search queries
          if (q === undefined || q === null || q === "" || (typeof q === "string" && q.trim() === "")) {
            const { q: _, ...restFilter } = filter;
            params.filter = restFilter;
          }
          // Note: We don't apply full-text search here because payment_packages
          // doesn't have searchable text columns. Users can filter by patient, service, status, etc.
        }
        // Debug: log the filter to see what's being sent
        console.log("PaymentPackages beforeGetList - filter:", params.filter);
        return params;
      },
      afterCreate: async (result, dataProvider) => {
        // No automatic installment creation - payments are flexible
        return result;
      },
    },
  ],
);

const applyFullTextSearch = (
  columns: string[],
  options: { useFtsSuffix?: boolean } = { useFtsSuffix: true }
) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;
  const { useFtsSuffix = true } = options;
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce((acc, column) => {
        if (column === "email") {
          const emailColumn = useFtsSuffix ? "email_fts" : "email";
          return {
            ...acc,
            [`${emailColumn}@ilike`]: q,
          };
        }
        if (column === "phone") {
          const phoneColumn = useFtsSuffix ? "phone_fts" : "phone";
          return {
            ...acc,
            [`${phoneColumn}@ilike`]: q,
          };
        }
        return {
          ...acc,
          [`${column}@ilike`]: q,
        };
      }, {}),
    },
  };
};

const uploadToBucket = async (fi: RAFile) => {
  if (!fi.src.startsWith("blob:") && !fi.src.startsWith("data:")) {
    // Sign URL check if path exists in the bucket
    if (fi.path) {
      const { error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(fi.path, 60);

      if (!error) {
        return;
      }
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src).then((res) => res.blob())
    : fi.rawFile;

  const file = fi.rawFile;
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, dataContent);

  if (uploadError) {
    logger.error("uploadError", uploadError, { context: "dataProvider" });
    throw new Error("Failed to upload attachment");
  }

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

  fi.path = filePath;
  fi.src = data.publicUrl;

  // save MIME type
  const mimeType = file.type;
  fi.type = mimeType;

  return fi;
};
