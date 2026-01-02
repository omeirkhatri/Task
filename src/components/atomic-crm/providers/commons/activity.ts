import type { DataProvider, Identifier } from "ra-core";

import {
  COMPANY_CREATED,
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
  DEAL_CREATED,
  DEAL_NOTE_CREATED,
  QUOTE_CREATED,
  QUOTE_UPDATED,
  TASK_CREATED,
  TASK_COMPLETED,
  DEAL_STATUS_CHANGED,
  DEAL_ARCHIVED,
  DEAL_UNARCHIVED,
  NOTE_DELETED,
  QUOTE_DELETED,
  TASK_DELETED,
  APPOINTMENT_CREATED,
  APPOINTMENT_DELETED,
} from "../../consts";
import type {
  Activity,
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Quote,
  Task,
  Appointment,
} from "../../types";

// FIXME: Requires 5 large queries to get the latest activities.
// Replace with a server-side view or a custom API endpoint.
export async function getActivityLog(
  dataProvider: DataProvider,
  companyId?: Identifier,
  salesId?: Identifier,
  contactId?: Identifier,
) {
  const companyFilter = {} as any;
  if (companyId) {
    companyFilter.id = companyId;
  } else if (salesId) {
    companyFilter["sales_id@in"] = `(${salesId})`;
  }

  const filter = {} as any;
  if (companyId) {
    filter.company_id = companyId;
  } else if (salesId) {
    filter["sales_id@in"] = `(${salesId})`;
  } else if (contactId) {
    filter.id = contactId;
  }

  const [newCompanies, newContactsAndNotes, newDealsAndNotes, newQuotes, newTasks, statusChanges, archiveChanges, deletions, appointments] =
    await Promise.all([
      getNewCompanies(dataProvider, companyFilter),
      getNewContactsAndNotes(dataProvider, filter),
      getNewDealsAndNotes(dataProvider, filter),
      getQuotes(dataProvider, filter),
      getTasks(dataProvider, filter),
      getStatusChanges(dataProvider, filter),
      getArchiveChanges(dataProvider, filter),
      getDeletions(dataProvider, filter),
      getAppointments(dataProvider, filter),
    ]);
  return (
    [...newCompanies, ...newContactsAndNotes, ...newDealsAndNotes, ...newQuotes, ...newTasks, ...statusChanges, ...archiveChanges, ...deletions, ...appointments]
      // sort by date desc
      .sort((a, b) => {
        const tsA = a.date ? new Date(a.date).getTime() : 0;
        const tsB = b.date ? new Date(b.date).getTime() : 0;
        return tsB - tsA;
      })
      // limit to 250 activities
      .slice(0, 250)
  );
}

const getNewCompanies = async (
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> => {
  const { data: companies } = await dataProvider.getList<Company>("companies", {
    filter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "created_at", order: "DESC" },
  });
  return companies.map((company) => ({
    id: `company.${company.id}.created`,
    type: COMPANY_CREATED,
    company_id: company.id,
    company,
    sales_id: company.sales_id,
    date: company.created_at,
  }));
};

async function getNewContactsAndNotes(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
    filter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "first_seen", order: "DESC" },
  });

  const recentContactNotesFilter = {} as any;
  if (filter.sales_id) {
    recentContactNotesFilter.sales_id = filter.sales_id;
  }
  if (filter.company_id) {
    // No company_id field in contactNote, filtering by related contacts instead.
    // This filter is only valid if a company has less than 250 contact.
    const contactIds = contacts.map((contact) => contact.id).join(",");
    recentContactNotesFilter["contact_id@in"] = `(${contactIds})`;
  }
  if (filter.id) {
    // Filter by specific contact ID
    recentContactNotesFilter.contact_id = filter.id;
  }

  const { data: contactNotes } = await dataProvider.getList<ContactNote>(
    "contactNotes",
    {
      filter: recentContactNotesFilter,
      pagination: { page: 1, perPage: 250 },
      sort: { field: "date", order: "DESC" },
    },
  );

  const newContacts = contacts.map((contact) => ({
    id: `contact.${contact.id}.created`,
    type: CONTACT_CREATED,
    company_id: contact.company_id,
    sales_id: contact.sales_id,
    contact,
    date: contact.first_seen,
  }));

  const newContactNotes = contactNotes.map((contactNote) => ({
    id: `contactNote.${contactNote.id}.created`,
    type: CONTACT_NOTE_CREATED,
    sales_id: contactNote.sales_id,
    contactNote,
    date: contactNote.date,
  }));

  return [...newContacts, ...newContactNotes];
}

async function getNewDealsAndNotes(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  // For contact filtering, we need to filter deals by lead_id
  const dealsFilter = {} as any;
  if (filter.id) {
    // Filter deals by lead_id (contact_id) when filtering by contact
    dealsFilter["@or"] = {
      lead_id: filter.id,
      "contact_ids@cs": `{${filter.id}}`,
    };
  } else {
    Object.assign(dealsFilter, filter);
  }

  // Use "deals" table directly (lead-journey is just a UI-facing resource name)
  const { data: deals } = await dataProvider.getList<Deal>("deals", {
    filter: dealsFilter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "created_at", order: "DESC" },
  });

  const recentDealNotesFilter = {} as any;
  if (filter.sales_id) {
    recentDealNotesFilter.sales_id = filter.sales_id;
  }
  if (filter.company_id) {
    // No company_id field in dealNote, filtering by related deals instead.
    // This filter is only valid if a deal has less than 250 notes.
    const dealIds = deals.map((deal) => deal.id).join(",");
    recentDealNotesFilter["deal_id@in"] = `(${dealIds})`;
  }
  if (filter.id) {
    // Filter deal notes by deals associated with this contact
    const dealIds = deals.map((deal) => deal.id).join(",");
    if (dealIds) {
      recentDealNotesFilter["deal_id@in"] = `(${dealIds})`;
    } else {
      // No deals for this contact, so no deal notes
      // Don't return DEAL_CREATED activities - they're duplicates of CONTACT_CREATED
      return [];
    }
  }

  const { data: dealNotes } = await dataProvider.getList<DealNote>(
    "dealNotes",
    {
      filter: recentDealNotesFilter,
      pagination: { page: 1, perPage: 250 },
      sort: { field: "date", order: "DESC" },
    },
  );

  // Filter out DEAL_CREATED activities - they're duplicates of CONTACT_CREATED
  // Only return deal notes, not deal creation activities
  const newDealNotes = dealNotes.map((dealNote) => ({
    id: `dealNote.${dealNote.id}.created`,
    type: DEAL_NOTE_CREATED,
    sales_id: dealNote.sales_id,
    dealNote,
    date: dealNote.date,
  }));

  return [...newDealNotes];
}

async function getQuotes(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const quotesFilter = {} as any;
  if (filter.sales_id) {
    quotesFilter.sales_id = filter.sales_id;
  }
  if (filter.company_id) {
    // Filter by contacts in the company
    const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
      filter: { company_id: filter.company_id },
      pagination: { page: 1, perPage: 250 },
    });
    const contactIds = contacts.map((contact) => contact.id).join(",");
    if (contactIds) {
      quotesFilter["contact_id@in"] = `(${contactIds})`;
    } else {
      return [];
    }
  }
  if (filter.id) {
    // Filter by specific contact ID
    quotesFilter.contact_id = filter.id;
  }

  const { data: quotes } = await dataProvider.getList<Quote>("quotes", {
    filter: quotesFilter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "updated_at", order: "DESC" },
  });

  return quotes.map((quote) => {
    // Use updated_at if it's different from created_at (quote was updated)
    const isUpdated = quote.updated_at && quote.updated_at !== quote.created_at;
    return {
      id: isUpdated
        ? `quote.${quote.id}.updated`
        : `quote.${quote.id}.created`,
      type: isUpdated ? QUOTE_UPDATED : QUOTE_CREATED,
      sales_id: quote.sales_id,
      quote,
      date: isUpdated ? quote.updated_at : quote.created_at,
    };
  });
}

async function getTasks(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const tasksFilter = {} as any;
  if (filter.sales_id) {
    tasksFilter.sales_id = filter.sales_id;
  }
  if (filter.company_id) {
    // Filter by contacts in the company
    const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
      filter: { company_id: filter.company_id },
      pagination: { page: 1, perPage: 250 },
    });
    const contactIds = contacts.map((contact) => contact.id).join(",");
    if (contactIds) {
      tasksFilter["contact_id@in"] = `(${contactIds})`;
    } else {
      return [];
    }
  }
  if (filter.id) {
    // Filter by specific contact ID
    tasksFilter.contact_id = filter.id;
  }

  const { data: tasks } = await dataProvider.getList<Task>("tasks", {
    filter: tasksFilter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "due_date", order: "DESC" },
  });

  const activities: Activity[] = [];

  tasks.forEach((task) => {
    // Task completed activity
    if (task.done_date) {
      const completionDate = task.done_date || task.due_date || task.created_at;
      if (completionDate) {
        activities.push({
          id: `task.${task.id}.completed`,
          type: TASK_COMPLETED,
          sales_id: task.sales_id,
          task,
          date: completionDate,
        });
      }
    }
    // Task created activity - always include; prefer created_at then due_date (never use current time)
    const creationDate = task.created_at || task.due_date;
    if (creationDate) {
      activities.push({
        id: `task.${task.id}.created`,
        type: TASK_CREATED,
        sales_id: task.sales_id,
        task,
        date: creationDate,
      });
    }
  });

  return activities;
}

async function getStatusChanges(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const statusChangeFilter = {} as any;
  
  if (filter.sales_id) {
    statusChangeFilter.sales_id = filter.sales_id;
  }
  
  // Build deal filter to find relevant deals
  const dealsFilter: any = {};
  if (filter.company_id) {
    dealsFilter.company_id = filter.company_id;
  }
  if (filter.id) {
    // When filtering by contact, we need to find deals associated with that contact
    dealsFilter["@or"] = {
      lead_id: filter.id,
      "contact_ids@cs": `{${filter.id}}`,
    };
  }
  
  // If we have deal filters, fetch deals first to get deal IDs
  let dealIds: Identifier[] = [];
  if (Object.keys(dealsFilter).length > 0) {
    const { data: deals } = await dataProvider.getList<Deal>("deals", {
      filter: dealsFilter,
      pagination: { page: 1, perPage: 250 },
    });
    
    dealIds = deals.map((deal) => deal.id);
    if (dealIds.length > 0) {
      statusChangeFilter["deal_id@in"] = `(${dealIds.join(",")})`;
    } else {
      // No deals found, return empty array
      return [];
    }
  }
  
  // Also filter by company_id if provided (for activity_log entries that have it)
  if (filter.company_id) {
    statusChangeFilter.company_id = filter.company_id;
  }

  // Read status changes from activity_log table
  let statusChanges: any[] = [];
  try {
    const result = await dataProvider.getList<any>("activity_log", {
      filter: {
        ...statusChangeFilter,
        type: "deal.statusChanged",
      },
      pagination: { page: 1, perPage: 250 },
      sort: { field: "date", order: "DESC" },
    });
    statusChanges = result?.data || [];
  } catch (error) {
    // If activity_log table doesn't exist or query fails, return empty array
    // This can happen if the migration hasn't been run yet
    console.warn("Failed to fetch status changes from activity_log:", error);
    return [];
  }

  // If no status changes found, return empty array
  // Note: This is expected if no status changes have been logged yet
  if (!statusChanges || statusChanges.length === 0) {
    return [];
  }

  // Fetch the current deal data for each status change
  const uniqueDealIds = [...new Set(statusChanges.map((sc: any) => sc.deal_id).filter(Boolean))];
  
  let dealsMap = new Map<Identifier, Deal>();
  if (uniqueDealIds.length > 0) {
    const { data: deals } = await dataProvider.getList<Deal>("deals", {
      filter: {
        "id@in": `(${uniqueDealIds.join(",")})`,
      },
      pagination: { page: 1, perPage: 250 },
    });
    deals?.forEach((deal) => {
      dealsMap.set(deal.id, deal);
    });
  }

  return statusChanges.map((statusChange: any) => {
    const deal = dealsMap.get(statusChange.deal_id);
    if (!deal) {
      // Deal might have been deleted, skip this status change
      return null;
    }
    
    return {
      id: `deal.${statusChange.deal_id}.statusChanged.${statusChange.id}`,
      type: DEAL_STATUS_CHANGED,
      company_id: statusChange.company_id || deal.company_id,
      sales_id: statusChange.sales_id || deal.sales_id,
      deal: {
        ...deal,
        // Use the new_stage from the activity log, or fall back to current deal stage
        stage: statusChange.new_stage || deal.stage,
      },
      old_stage: statusChange.old_stage,
      new_stage: statusChange.new_stage,
      date: statusChange.date || new Date().toISOString(),
    };
  }).filter((activity): activity is Activity => activity !== null);
}

async function getArchiveChanges(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const archiveFilter = {} as any;
  
  if (filter.sales_id) {
    archiveFilter.sales_id = filter.sales_id;
  }
  
  // Build deal filter to find relevant deals
  const dealsFilter: any = {};
  if (filter.company_id) {
    dealsFilter.company_id = filter.company_id;
  }
  if (filter.id) {
    // When filtering by contact, we need to find deals associated with that contact
    dealsFilter["@or"] = {
      lead_id: filter.id,
      "contact_ids@cs": `{${filter.id}}`,
    };
  }
  
  // If we have deal filters, fetch deals first to get deal IDs
  let dealIds: Identifier[] = [];
  if (Object.keys(dealsFilter).length > 0) {
    const { data: deals } = await dataProvider.getList<Deal>("deals", {
      filter: dealsFilter,
      pagination: { page: 1, perPage: 250 },
    });
    
    dealIds = deals.map((deal) => deal.id);
    if (dealIds.length > 0) {
      archiveFilter["deal_id@in"] = `(${dealIds.join(",")})`;
    } else {
      // No deals found, return empty array
      return [];
    }
  }
  
  // Also filter by company_id if provided
  if (filter.company_id) {
    archiveFilter.company_id = filter.company_id;
  }

  // Read archive changes from activity_log table
  let archiveChanges: any[] = [];
  try {
    const result = await dataProvider.getList<any>("activity_log", {
      filter: {
        ...archiveFilter,
        "type@in": "(deal.archived,deal.unarchived)",
      },
      pagination: { page: 1, perPage: 250 },
      sort: { field: "date", order: "DESC" },
    });
    archiveChanges = result?.data || [];
  } catch (error) {
    console.warn("Failed to fetch archive changes from activity_log:", error);
    return [];
  }

  // If no archive changes found, return empty array
  if (!archiveChanges || archiveChanges.length === 0) {
    return [];
  }

  // Fetch the current deal data for each archive change
  const uniqueDealIds = [...new Set(archiveChanges.map((ac: any) => ac.deal_id).filter(Boolean))];
  
  let dealsMap = new Map<Identifier, Deal>();
  if (uniqueDealIds.length > 0) {
    const { data: deals } = await dataProvider.getList<Deal>("deals", {
      filter: {
        "id@in": `(${uniqueDealIds.join(",")})`,
      },
      pagination: { page: 1, perPage: 250 },
    });
    deals?.forEach((deal) => {
      dealsMap.set(deal.id, deal);
    });
  }

  return archiveChanges.map((archiveChange: any) => {
    const deal = dealsMap.get(archiveChange.deal_id);
    if (!deal) {
      // Deal might have been deleted, skip this archive change
      return null;
    }
    
    const activityType = archiveChange.type === "deal.archived" ? DEAL_ARCHIVED : DEAL_UNARCHIVED;
    
    return {
      id: `deal.${archiveChange.deal_id}.${archiveChange.type}.${archiveChange.id}`,
      type: activityType,
      company_id: archiveChange.company_id || deal.company_id,
      sales_id: archiveChange.sales_id || deal.sales_id,
      deal,
      date: archiveChange.date || new Date().toISOString(),
    };
  }).filter((activity): activity is Activity => activity !== null);
}

async function getDeletions(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const deletionFilter = {} as any;
  if (filter.sales_id) {
    deletionFilter.sales_id = filter.sales_id;
  }
  if (filter.id) {
    // Filter by specific contact ID
    deletionFilter.contact_id = filter.id;
  }
  if (filter.company_id) {
    // For company filter, we need to get contact IDs first
    const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
      filter: { company_id: filter.company_id },
      pagination: { page: 1, perPage: 250 },
    });
    const contactIds = contacts.map((contact) => contact.id).join(",");
    if (contactIds) {
      deletionFilter["contact_id@in"] = `(${contactIds})`;
    } else {
      return [];
    }
  }

  const { data: deletions } = await dataProvider.getList<any>("activity_log", {
    filter: {
      ...deletionFilter,
      "type@in": "(note.deleted,quote.deleted,task.deleted)",
    },
    pagination: { page: 1, perPage: 250 },
    sort: { field: "date", order: "DESC" },
  });

  return deletions.map((deletion) => {
    const baseActivity = {
      id: `deletion.${deletion.id}`,
      sales_id: deletion.sales_id,
      date: deletion.date,
    };

    if (deletion.type === "note.deleted") {
      return {
        ...baseActivity,
        type: NOTE_DELETED,
        contact_id: deletion.contact_id,
        deal_id: deletion.deal_id,
        note_text: deletion.note_text,
      };
    } else if (deletion.type === "quote.deleted") {
      return {
        ...baseActivity,
        type: QUOTE_DELETED,
        contact_id: deletion.contact_id,
        quote_amount: deletion.quote_amount,
        quote_description: deletion.quote_description,
      };
    } else if (deletion.type === "task.deleted") {
      return {
        ...baseActivity,
        type: TASK_DELETED,
        contact_id: deletion.contact_id,
        task_text: deletion.task_text,
        task_type: deletion.task_type,
      };
    }
    return null;
  }).filter((activity): activity is Activity => activity !== null);
}

async function getAppointments(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const appointmentFilter = {} as any;
  
  if (filter.sales_id) {
    appointmentFilter.sales_id = filter.sales_id;
  }
  if (filter.id) {
    // Filter by specific contact ID
    appointmentFilter.contact_id = filter.id;
  }
  if (filter.company_id) {
    // For company filter, we need to get contact IDs first
    const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
      filter: { company_id: filter.company_id },
      pagination: { page: 1, perPage: 250 },
    });
    const contactIds = contacts.map((contact) => contact.id).join(",");
    if (contactIds) {
      appointmentFilter["contact_id@in"] = `(${contactIds})`;
    } else {
      return [];
    }
  }

  // Fetch appointment activities from activity_log
  let appointmentActivities: any[] = [];
  try {
    const result = await dataProvider.getList<any>("activity_log", {
      filter: {
        ...appointmentFilter,
        "type@in": "(appointment.created,appointment.deleted)",
      },
      pagination: { page: 1, perPage: 250 },
      sort: { field: "date", order: "DESC" },
    });
    appointmentActivities = result?.data || [];
  } catch (error) {
    console.warn("Failed to fetch appointment activities from activity_log:", error);
    return [];
  }

  if (!appointmentActivities || appointmentActivities.length === 0) {
    return [];
  }

  // Fetch appointment details for created appointments
  const appointmentIds = appointmentActivities
    .filter((a) => a.type === "appointment.created" && a.appointment_id)
    .map((a) => a.appointment_id);
  
  let appointmentsMap = new Map<Identifier, Appointment>();
  if (appointmentIds.length > 0) {
    try {
      const { data: appointments } = await dataProvider.getList<Appointment>("appointments", {
        filter: {
          "id@in": `(${appointmentIds.join(",")})`,
        },
        pagination: { page: 1, perPage: 250 },
      });
      appointments?.forEach((apt) => {
        appointmentsMap.set(apt.id, apt);
      });
    } catch (error) {
      console.warn("Failed to fetch appointment details:", error);
    }
  }

  return appointmentActivities.map((activityLog: any) => {
    const baseActivity = {
      id: `appointment.${activityLog.appointment_id || activityLog.id}.${activityLog.type}`,
      sales_id: activityLog.sales_id,
      contact_id: activityLog.contact_id,
      date: activityLog.date || new Date().toISOString(),
    };

    if (activityLog.type === "appointment.created") {
      const appointment = appointmentsMap.get(activityLog.appointment_id);
      return {
        ...baseActivity,
        type: APPOINTMENT_CREATED,
        appointment_id: activityLog.appointment_id,
        appointment,
      };
    } else if (activityLog.type === "appointment.deleted") {
      return {
        ...baseActivity,
        type: APPOINTMENT_DELETED,
        appointment_id: activityLog.appointment_id,
        appointment_date: activityLog.appointment_date,
        appointment_type: activityLog.appointment_type,
      };
    }
    return null;
  }).filter((activity): activity is Activity => activity !== null);
}
