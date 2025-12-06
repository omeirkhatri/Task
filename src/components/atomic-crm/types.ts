import type { Identifier, RaRecord } from "ra-core";
import type { ComponentType } from "react";

import type {
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
} from "./consts";

export type SignUpData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type SalesFormData = {
  avatar: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  administrator: boolean;
  disabled: boolean;
};

export type Sale = {
  first_name: string;
  last_name: string;
  administrator: boolean;
  avatar?: RAFile;
  disabled?: boolean;
  user_id: string;

  /**
   * This is a copy of the user's email, to make it easier to handle by react admin
   * DO NOT UPDATE this field directly, it should be updated by the backend
   */
  email: string;

  /**
   * This is used by the fake rest provider to store the password
   * DO NOT USE this field in your code besides the fake rest provider
   * @deprecated
   */
  password?: string;
} & Pick<RaRecord, "id">;

export type Service = {
  name: string;
  created_at: string;
} & Pick<RaRecord, "id">;

export type Company = {
  name: string;
  logo: RAFile;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  linkedin_url: string;
  website: string;
  phone_number: string;
  address: string;
  zipcode: string;
  city: string;
  stateAbbr: string;
  sales_id: Identifier;
  created_at: string;
  description: string;
  revenue: string;
  tax_identifier: string;
  country: string;
  context_links?: string[];
  nb_contacts?: number;
  nb_deals?: number;
  // B2C fields for clients
  services?: Identifier[];
  status?: string;
  nb_tasks?: number;
} & Pick<RaRecord, "id">;

export type EmailAndType = {
  email: string;
  type: "Work" | "Home" | "Other";
};

export type PhoneNumberAndType = {
  number: string;
  type: "Work" | "Home" | "Other";
};

export type Contact = {
  first_name: string;
  last_name: string;
  title: string;
  company_id: Identifier;
  email_jsonb: EmailAndType[];
  avatar?: Partial<RAFile>;
  linkedin_url?: string | null;
  first_seen: string;
  last_seen: string;
  has_newsletter: boolean;
  tags: Identifier[];
  gender: string;
  sales_id: Identifier;
  status: string;
  background: string;
  phone_jsonb: PhoneNumberAndType[];
  nb_tasks?: number;
  company_name?: string;
  // B2C fields for leads
  flat_villa_number?: string;
  building_street?: string;
  area?: string;
  google_maps_link?: string;
  phone_has_whatsapp?: boolean;
  services_interested?: Identifier[];
} & Pick<RaRecord, "id">;

// Type alias for clarity - Lead is a Contact in B2C context
export type Lead = Contact;

// Type alias for clarity - Client is a Company in B2C context
export type Client = Company;

export type ContactNote = {
  contact_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  status: string;
  attachments?: AttachmentNote[];
} & Pick<RaRecord, "id">;

export type Deal = {
  name: string;
  company_id: Identifier;
  contact_ids: Identifier[];
  category: string;
  stage: string;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  expected_closing_date: string;
  sales_id: Identifier;
  index: number;
  // B2C field for lead status
  lead_id?: Identifier;
} & Pick<RaRecord, "id">;

// Type alias for clarity - LeadStatus is a Deal in B2C context
export type LeadStatus = Deal;

export type DealNote = {
  deal_id: Identifier;
  text: string;
  date: string;
  sales_id: Identifier;
  attachments?: AttachmentNote[];

  // This is defined for compatibility with `ContactNote`
  status?: undefined;
} & Pick<RaRecord, "id">;

export type Tag = {
  name: string;
  color: string;
} & Pick<RaRecord, "id">;

export type Task = {
  contact_id: Identifier;
  type: string;
  text: string;
  due_date: string;
  done_date?: string | null;
  sales_id?: Identifier;
  created_at?: string;
} & Pick<RaRecord, "id">;

export type Quote = {
  contact_id: Identifier;
  service_id?: Identifier;
  description?: string;
  amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected";
  created_at: string;
  updated_at: string;
  sales_id?: Identifier;
} & Pick<RaRecord, "id">;

export type ActivityCompanyCreated = {
  type: typeof COMPANY_CREATED;
  company_id: Identifier;
  company: Company;
  sales_id: Identifier;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactCreated = {
  type: typeof CONTACT_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  contact: Contact;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactNoteCreated = {
  type: typeof CONTACT_NOTE_CREATED;
  sales_id?: Identifier;
  contactNote: ContactNote;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealCreated = {
  type: typeof DEAL_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
};

export type ActivityDealNoteCreated = {
  type: typeof DEAL_NOTE_CREATED;
  sales_id?: Identifier;
  dealNote: DealNote;
  date: string;
};

export type ActivityQuoteCreated = {
  type: typeof QUOTE_CREATED;
  sales_id?: Identifier;
  quote: Quote;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityQuoteUpdated = {
  type: typeof QUOTE_UPDATED;
  sales_id?: Identifier;
  quote: Quote;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityTaskCreated = {
  type: typeof TASK_CREATED;
  sales_id?: Identifier;
  task: Task;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityTaskCompleted = {
  type: typeof TASK_COMPLETED;
  sales_id?: Identifier;
  task: Task;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealStatusChanged = {
  type: typeof DEAL_STATUS_CHANGED;
  company_id?: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
  old_stage?: string | null;
  new_stage?: string | null;
} & Pick<RaRecord, "id">;

export type ActivityDealArchived = {
  type: typeof DEAL_ARCHIVED;
  company_id?: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealUnarchived = {
  type: typeof DEAL_UNARCHIVED;
  company_id?: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityNoteDeleted = {
  type: typeof NOTE_DELETED;
  sales_id?: Identifier;
  contact_id?: Identifier;
  deal_id?: Identifier;
  note_text?: string;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityQuoteDeleted = {
  type: typeof QUOTE_DELETED;
  sales_id?: Identifier;
  contact_id?: Identifier;
  quote_amount?: number;
  quote_description?: string;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityTaskDeleted = {
  type: typeof TASK_DELETED;
  sales_id?: Identifier;
  contact_id?: Identifier;
  task_text?: string;
  task_type?: string;
  date: string;
} & Pick<RaRecord, "id">;

export type Activity = RaRecord &
  (
    | ActivityCompanyCreated
    | ActivityContactCreated
    | ActivityContactNoteCreated
    | ActivityDealCreated
    | ActivityDealNoteCreated
    | ActivityQuoteCreated
    | ActivityQuoteUpdated
    | ActivityTaskCreated
    | ActivityTaskCompleted
    | ActivityDealStatusChanged
    | ActivityDealArchived
    | ActivityDealUnarchived
    | ActivityNoteDeleted
    | ActivityQuoteDeleted
    | ActivityTaskDeleted
  );

export interface RAFile {
  src: string;
  title: string;
  path?: string;
  rawFile: File;
  type?: string;
}

export type AttachmentNote = RAFile;
export interface DealStage {
  value: string;
  label: string;
}

export interface NoteStatus {
  value: string;
  label: string;
  color: string;
}

export interface ContactGender {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}
