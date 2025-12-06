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

const processCompanyLogo = async (params: any) => {
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

const dataProviderWithCustomMethods = {
  ...baseDataProvider,
  async getList(resource: string, params: GetListParams) {
    const mappedResource = mapResourceName(resource);
    
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
    
    // Handle lead_stage filter for contacts resource - filter contacts by their deal stage
    if ((resource === "contacts" || resource === "clients") && params.filter && "lead_stage" in params.filter) {
      const stage = params.filter.lead_stage;
      delete params.filter.lead_stage;
      
      // Fetch all deals with the specified stage
      const { data: dealsWithStage } = await baseDataProvider.getList("deals", {
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
        filter: { stage: stage },
      });
      
      // Extract unique lead_ids (contact IDs) from deals, falling back to legacy contact_ids array
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
            .filter((id: Identifier | undefined): id is Identifier => id !== undefined && id !== null),
        ),
      );
      
      // Filter contacts by those IDs
      if (contactIds.length > 0) {
        params.filter["id@in"] = `(${contactIds.join(",")})`;
      } else {
        // No contacts match, return empty result by using a non-existent ID
        params.filter["id@in"] = "(-1)";
      }
    }
    
    // Handle isClient filter for clients resource - filter contacts that have deals with stage="converted"
    if (resource === "clients" && params.filter && "isClient" in params.filter) {
      delete params.filter.isClient;
      
      // Fetch all deals with stage="converted"
      const { data: convertedDeals } = await baseDataProvider.getList("deals", {
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
        filter: { stage: "converted" },
      });
      
      // Extract unique lead_ids (contact IDs) from converted deals, falling back to legacy contact_ids array
      const clientContactIds = Array.from(
        new Set(
          convertedDeals
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
            .filter((id: Identifier | undefined): id is Identifier => id !== undefined && id !== null),
        ),
      );
      
      // Filter contacts by those IDs
      if (clientContactIds.length > 0) {
        params.filter["id@in"] = `(${clientContactIds.join(",")})`;
      } else {
        // No clients found, return empty result by using a non-existent ID
        params.filter["id@in"] = "(-1)";
      }
    }
    
    // Handle hasArchivedDeals filter for clients resource - filter by whether their converted deals are archived
    if (resource === "clients" && params.filter && "hasArchivedDeals" in params.filter) {
      const hasArchivedDeals = params.filter.hasArchivedDeals;
      delete params.filter.hasArchivedDeals;
      
      // Fetch all deals with stage="converted"
      const { data: convertedDeals } = await baseDataProvider.getList("deals", {
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
        filter: { stage: "converted" },
      });
      
      if (!convertedDeals || convertedDeals.length === 0) {
        // No converted deals, return empty result
        params.filter["id@in"] = "(-1)";
      } else {
        // Filter deals by archived status
        const filteredDeals = convertedDeals.filter((deal: Deal) => {
          const isArchived = deal.archived_at != null && deal.archived_at !== "";
          return hasArchivedDeals ? isArchived : !isArchived;
        });
        
        // Extract unique lead_ids (contact IDs) from filtered deals, falling back to legacy contact_ids array
        const clientContactIds = Array.from(
          new Set(
            filteredDeals
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
        
        // If we already have an id@in filter from isClient, we need to intersect the sets
        if (params.filter["id@in"]) {
          const existingIds = params.filter["id@in"]
            .replace(/[()]/g, "")
            .split(",")
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
          
          const intersection = existingIds.filter((id: number) => clientContactIds.includes(id));
          
          if (intersection.length > 0) {
            params.filter["id@in"] = `(${intersection.join(",")})`;
          } else {
            params.filter["id@in"] = "(-1)";
          }
        } else {
          // No existing filter, just use the archived filter result
          if (clientContactIds.length > 0) {
            params.filter["id@in"] = `(${clientContactIds.join(",")})`;
          } else {
            params.filter["id@in"] = "(-1)";
          }
        }
      }
    }
    
    // Handle services_interested@cs filters for contacts - only when a services filter is actually selected
    if ((resource === "contacts" || resource === "contacts_summary") && params.filter && Object.keys(params.filter).length > 0) {
      // Check if there's actually a services_interested filter
      const hasServicesFilter = params.filter["services_interested@cs"] || 
        (params.filter["@or"] && typeof params.filter["@or"] === "object" && 
         Object.keys(params.filter["@or"]).some(key => key.startsWith("services_interested@cs")));
      
      // Only process services filter logic if there's actually a services filter
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
    return baseDataProvider.create(mappedResource, params);
  },
  async update(resource: string, params: any) {
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
            const activityData: any = {
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
                console.warn("Failed to log status change to activity_log. Please run migration 20250208000000_add_status_change_tracking.sql:", fallbackError);
              }
            }
          } catch (error) {
            console.warn("Error logging status change:", error);
          }
        }
        
        // Check if archived_at is changing (archive/unarchive)
        if ("archived_at" in params.data) {
          const wasArchived = previousDeal.archived_at != null;
          const willBeArchived = params.data.archived_at != null;
          
          // Only log if the archive status is actually changing
          if (wasArchived !== willBeArchived) {
            try {
              const activityData: any = {
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
                  console.warn("Failed to log archive/unarchive to activity_log:", fallbackError);
                }
              }
            } catch (error) {
              console.warn("Error logging archive/unarchive:", error);
            }
          }
        }
      }
    }
    
    return baseDataProvider.update(mappedResource, params);
  },
  async delete(resource: string, params: any) {
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
    let record: any = null;
    const { data: fetchedRecord } = await supabase
      .from(mappedResource)
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    
    record = fetchedRecord;
    
    // Create deletion activity before deleting
    if (record) {
      const activityData: any = {
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
      }

      // Only create activity log entry if it's a note, quote, or task
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
      console.error("signUp.error", response.error);
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
    const { data, error } = await supabase.functions.invoke<Sale>("users", {
      method: "POST",
      body,
    });

    if (!data || error) {
      console.error("salesCreate.error", error);
      throw new Error("Failed to create account manager");
    }

    return data;
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
      console.error("salesCreate.error", error);
      throw new Error("Failed to update account manager");
    }

    return data;
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
      console.error("passwordUpdate.error", error);
      throw new Error("Failed to update password");
    }

    return passwordUpdated;
  },
  async unarchiveDeal(deal: Deal) {
    // Log unarchive action before processing
    try {
      const activityData: any = {
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
          console.warn("Failed to log unarchive to activity_log:", fallbackError);
        }
      }
    } catch (error) {
      console.warn("Error logging unarchive:", error);
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
  ],
);

const applyFullTextSearch = (columns: string[]) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce((acc, column) => {
        if (column === "email")
          return {
            ...acc,
            [`email_fts@ilike`]: q,
          };
        if (column === "phone")
          return {
            ...acc,
            [`phone_fts@ilike`]: q,
          };
        else
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
    console.error("uploadError", uploadError);
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
