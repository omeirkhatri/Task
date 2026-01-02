import type { Identifier, RaRecord } from "ra-core";

export type PaymentPackage = {
  patient_id: Identifier;
  service_id?: Identifier;
  package_type: "session-based" | "time-based" | "post-payment";
  total_amount: number;
  price_per_hour?: number | null;
  total_sessions?: number | null;
  total_hours?: number | null;
  duration_days?: number | null;
  hours_per_day?: number | null;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  renewal_date?: string | null; // YYYY-MM-DD
  next_payment_date?: string | null; // YYYY-MM-DD
  status: "active" | "completed" | "expired";
  renewed_from_package_id?: Identifier | null;
  name?: string | null; // Human-readable package name
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type PaymentTransaction = {
  payment_package_id: Identifier;
  amount_received: number;
  bank_charge: number;
  net_amount: number;
  payment_method: "POS" | "Tabby" | "Payment Link" | "Ziina" | "Cash";
  date_paid: string; // YYYY-MM-DD
  date_received: string; // YYYY-MM-DD
  invoice_number?: string | null;
  installment_number?: number | null;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type PackageUsage = {
  payment_package_id: Identifier;
  appointment_id?: Identifier | null;
  usage_type: "session" | "hours";
  quantity_used: number;
  usage_date: string; // YYYY-MM-DD
  is_manual_adjustment: boolean;
  notes?: string | null;
  created_at: string;
} & Pick<RaRecord, "id">;

export type InstallmentSchedule = {
  payment_package_id: Identifier;
  installment_number: number;
  due_date: string; // YYYY-MM-DD
  amount_due: number;
  is_paid: boolean;
  paid_date?: string | null; // YYYY-MM-DD
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

export type PaymentSettings = {
  payment_method: "POS" | "Tabby" | "Payment Link" | "Ziina" | "Cash";
  fee_percentage?: number | null;
  fixed_fee_amount?: number | null;
  vat_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, "id">;

