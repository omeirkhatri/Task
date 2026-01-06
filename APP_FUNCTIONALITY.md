# Application Functionality Overview

This document explains how the core features of the application work: Staff Management, Client Management, Appointment Booking (including recurring appointments), and Finance/Payment Tracking.

---

## 1. Staff Management

### Overview
Staff members are healthcare professionals and support personnel who provide services to clients. The system tracks staff information and assigns them to appointments.

### Staff Schema
The `staff` table stores:
- **Basic Information**: `first_name`, `last_name`, `phone` (required), `email` (optional)
- **Role Classification**: `staff_type` - defines the type of staff member
- **Status**: `status` - either "active" or "inactive"
- **Specialization**: `specialization` (optional field for additional details)
- **Timestamps**: `created_at`, `updated_at`

### Staff Types
The system supports the following staff types:
- **Doctor**: Medical doctors who provide consultations
- **Nurse**: Nursing staff
- **Physiotherapist**: Physical therapy specialists
- **Caregiver**: Home care providers
- **Management**: Administrative staff
- **Driver**: Transportation staff for patient pickup/dropoff

### How Staff Works
1. **Creating Staff**: When creating a new staff member, you provide their name, phone number, email (optional), and select their staff type. The system automatically sets their status to "active".

2. **Staff Assignment to Appointments**: Staff can be assigned to appointments in multiple ways:
   - **Primary Staff** (`primary_staff_id`): The main staff member responsible for the appointment (e.g., the doctor for a consultation)
   - **Driver** (`driver_id`): Staff member assigned for transportation
   - **Additional Staff** (`appointment_staff_assignments`): Multiple staff can be assigned via a junction table, allowing many-to-many relationships

3. **Staff Roles in Assignments**: The `appointment_staff_assignments` table uses a `role` field that can be:
   - `primary`: Primary staff member
   - `driver`: Driver for transportation
   - `other`: Additional staff members (e.g., nurses, caregivers)

### Example
Dr. Sarah Ahmed is created as a staff member with:
- `first_name`: "Sarah"
- `last_name`: "Ahmed"
- `staff_type`: "Doctor"
- `phone`: "+971501234567"
- `email`: "sarah.ahmed@example.com"
- `status`: "active"

When assigned to an appointment, she can be set as `primary_staff_id`, and additional nurses can be added via `appointment_staff_assignments` with `role: "other"`.

---

## 2. Client Management

### Overview
Clients (patients) are stored in the `contacts` table. The system treats contacts as clients when they have appointments or payment packages. Clients can have multiple appointments and payment packages.

### Client Schema
The `contacts` table stores comprehensive client information:

**Basic Information**:
- `first_name`, `last_name`, `title`, `gender`
- `email_jsonb`: Array of email objects with type (Work, Home, Other)
- `phone_jsonb`: Array of phone objects with type (Work, Home, Other) and WhatsApp flag
- `avatar`: Profile picture stored as JSONB

**Location Information** (B2C fields):
- `flat_villa_number`, `building_street`, `area`, `city`
- `google_maps_link`, `latitude`, `longitude`
- `phone_has_whatsapp`: Boolean flag for WhatsApp availability

**Relationship & Tracking**:
- `company_id`: Links to companies table (optional)
- `sales_id`: Links to sales staff member
- `tags`: Array of tag IDs for categorization
- `status`: Client status (e.g., "active", "inactive")
- `first_seen`, `last_seen`: Timestamps for tracking engagement
- `has_newsletter`: Boolean for newsletter subscription

**Service Interest**:
- `services_interested`: Array of service IDs the client is interested in
- `description`: Additional notes about the client

### How Clients Work
1. **Creating Clients**: When creating a new client, you provide their personal information, contact details (multiple emails/phones supported), location details, and optionally link them to services they're interested in. The system automatically sets `first_seen` and `last_seen` to the current timestamp.

2. **Client Identification**: Clients are identified by their contact record. The `isclient` field (in summary views) helps distinguish clients from leads.

3. **Client-Appointment Relationship**: Clients are linked to appointments via `patient_id` in the appointments table, which references `contacts.id`.

4. **Client-Payment Relationship**: Clients are linked to payment packages via `patient_id` in the payment_packages table.

### Example
John Doe is created as a client with:
- `first_name`: "John"
- `last_name`: "Doe"
- `phone_jsonb`: `[{type: "Home", number: "+971501234567", has_whatsapp: true}]`
- `email_jsonb`: `[{type: "Work", email: "john.doe@example.com"}]`
- `area`: "Dubai Marina"
- `city`: "Dubai"
- `services_interested`: [1, 3] (IDs for physiotherapy and caregiver services)

This client can then have multiple appointments and payment packages linked to their record.

---

## 3. Appointment Booking

### Overview
Appointments are scheduled sessions between clients and staff. The system supports both one-time and recurring appointments, with flexible staff assignment and payment package linking.

### Appointment Schema
The `appointments` table stores:

**Core Scheduling**:
- `patient_id`: Foreign key to `contacts` table (required)
- `appointment_date`: Date of the appointment (YYYY-MM-DD)
- `start_time`, `end_time`: Timestamps with timezone for precise scheduling
- `duration_minutes`: Duration in minutes (default: 60)

**Appointment Details**:
- `appointment_type`: One of: `doctor_on_call`, `lab_test`, `teleconsultation`, `physiotherapy`, `caregiver`, `iv_therapy`
- `status`: `scheduled`, `confirmed`, `completed`, `cancelled`
- `notes`, `mini_notes`, `full_notes`: Different levels of notes
- `pickup_instructions`: Special instructions for driver/pickup
- `custom_fields`: JSONB for flexible additional data

**Staff Assignment**:
- `primary_staff_id`: Foreign key to `staff` table (main staff member)
- `driver_id`: Foreign key to `staff` table (driver for transportation)
- `appointment_staff_assignments`: Junction table for multiple staff members

**Payment Linking**:
- `payment_package_id`: Foreign key to `payment_packages` table (links appointment to a payment package)

**Recurrence** (for recurring appointments):
- `is_recurring`: Boolean flag
- `recurrence_id`: UUID that groups all instances of a recurring series
- `recurrence_config`: JSONB storing recurrence pattern (only on parent appointment)
- `recurrence_sequence`: Integer indicating position in series (0 = parent, 1+ = instances)

### Appointment Staff Assignments
The `appointment_staff_assignments` junction table enables many-to-many relationships:
- `appointment_id`: Links to appointment
- `staff_id`: Links to staff member
- `role`: `primary`, `driver`, or `other`
- Unique constraint on (`appointment_id`, `staff_id`, `role`) prevents duplicates

### How Appointment Booking Works

#### Creating a Single Appointment
1. **Select Client**: Choose the patient from the contacts list
2. **Set Date & Time**: Select appointment date, start time, and end time (or duration)
3. **Choose Type**: Select appointment type (doctor_on_call, physiotherapy, etc.)
4. **Assign Staff**: 
   - Set primary staff (required for most types)
   - Optionally assign driver
   - Add additional staff via the assignments table
5. **Link Payment Package** (optional): If the appointment is part of a prepaid package, link it
6. **Add Notes**: Add any relevant notes or pickup instructions
7. **Set Status**: Default is "scheduled", can be changed to "confirmed"

#### Creating Recurring Appointments
When creating a recurring appointment, the system:

1. **Configure Recurrence Pattern**: 
   - **Pattern**: `daily`, `weekly`, `monthly`, `yearly`, or `custom`
   - **Interval**: How often (e.g., every 2 weeks, every 3 months)
   - **End Type**: Either `date` (end on specific date) or `occurrences` (end after N occurrences)
   - **End Date** (if end_type is "date"): Final date for the series
   - **Occurrences** (if end_type is "occurrences"): Number of appointments to create (max 1000)

2. **Weekly Pattern Options**:
   - `days_of_week`: Array of day numbers (0=Sunday, 6=Saturday)
   - Example: `[1, 3, 5]` = Monday, Wednesday, Friday every week

3. **Monthly Pattern Options**:
   - `day_of_month`: Specific day (1-31), e.g., 15th of every month
   - `week_of_month` + `days_of_week`: e.g., first Monday of every month

4. **Yearly Pattern Options**:
   - `month`: Month number (1-12)
   - `day_of_month` or `week_of_month` + `days_of_week`: Specific date or day

5. **Generation Process**:
   - System generates a unique `recurrence_id` (UUID)
   - Creates the parent appointment with `recurrence_sequence: 0` and stores `recurrence_config` in JSONB
   - Generates all child appointments with the same `recurrence_id` and incrementing `recurrence_sequence`
   - All appointments share the same base data (patient, staff, type, notes) but have calculated dates/times
   - All appointments in the series are linked to the same `payment_package_id` if specified

### Recurring Appointment Examples

**Example 1: Daily for 30 days**
- Pattern: `daily`
- Interval: `1`
- End type: `occurrences`
- Occurrences: `30`
- Result: Creates 30 appointments, one per day starting from the base date

**Example 2: Weekly on Monday, Wednesday, Friday for 3 months**
- Pattern: `weekly`
- Interval: `1`
- Days of week: `[1, 3, 5]` (Mon, Wed, Fri)
- End type: `date`
- End date: `2025-04-30`
- Result: Creates appointments every Mon/Wed/Fri until April 30, 2025

**Example 3: Monthly on the 15th for 12 occurrences**
- Pattern: `monthly`
- Interval: `1`
- Day of month: `15`
- End type: `occurrences`
- Occurrences: `12`
- Result: Creates 12 appointments, on the 15th of each month

**Example 4: Every 2 weeks on Tuesday and Thursday**
- Pattern: `weekly`
- Interval: `2`
- Days of week: `[2, 4]` (Tue, Thu)
- End type: `occurrences`
- Occurrences: `20`
- Result: Creates 20 appointments, every other Tuesday and Thursday

### Appointment Status Flow
1. **Scheduled**: Initial state when appointment is created
2. **Confirmed**: Appointment is confirmed with client
3. **Completed**: Appointment has been completed (triggers package usage tracking if linked to package)
4. **Cancelled**: Appointment was cancelled (removes usage for session-based packages if previously completed)

### Package Usage Auto-Tracking
When an appointment's status changes to "completed" and it's linked to a payment package:
- **Session-based packages**: Automatically creates a `package_usage` record with `quantity_used: 1` and `usage_type: "session"`
- **Time-based packages**: Calculates hours from `start_time` and `end_time`, creates `package_usage` record with calculated hours and `usage_type: "hours"`
- If appointment is cancelled after being completed, the usage record is removed (for session-based only)

---

## 4. Finance & Payment Tracking

### Overview
The finance system tracks payment packages, transactions, and usage. Clients purchase packages (session-based, time-based, or post-payment), and the system tracks payments, installments, and package consumption.

### Payment Package Schema
The `payment_packages` table stores:

**Core Package Information**:
- `patient_id`: Foreign key to `contacts` table (required)
- `service_id`: Foreign key to `services` table (optional)
- `package_type`: `session-based`, `time-based`, or `post-payment`
- `total_amount`: Total price of the package (AED)
- `status`: `active`, `completed`, or `expired`
- `start_date`, `end_date`, `renewal_date`: Date tracking
- `renewed_from_package_id`: Links to parent package if this is a renewal

**Session-Based Package Fields** (when `package_type = "session-based"`):
- `total_sessions`: Number of sessions included (e.g., 10 sessions)
- `price_per_hour`: Not used for session-based

**Time-Based Package Fields** (when `package_type = "time-based"`):
- `total_hours`: Total hours included (e.g., 360 hours)
- `duration_days`: Number of days the package covers (e.g., 30 days)
- `hours_per_day`: Hours per day (e.g., 12 hours/day)
- `price_per_hour`: Hourly rate (e.g., 19.44 AED/hour)

**Post-Payment Package Fields** (when `package_type = "post-payment"`):
- Used for services paid after delivery
- No specific quantity fields

### Payment Transaction Schema
The `payment_transactions` table stores individual payments:

- `payment_package_id`: Foreign key to `payment_packages` (required)
- `amount_received`: Gross amount received from client (AED)
- `bank_charge`: Calculated bank/processing fee (AED)
- `net_amount`: `amount_received - bank_charge` (automatically calculated)
- `payment_method`: `POS`, `Tabby`, `Payment Link`, `Ziina`, or `Cash`
- `date_paid`: Date client paid
- `date_received`: Date payment was received
- `invoice_number`: Optional invoice reference
- `installment_number`: Links to installment schedule if part of installment plan

### Payment Settings Schema
The `payment_settings` table configures bank charges per payment method:

- `payment_method`: One of the 5 supported methods
- `fee_percentage`: Percentage fee (e.g., 1.9%)
- `fixed_fee_amount`: Fixed fee amount (e.g., 1.00 AED)
- `vat_percentage`: VAT percentage (default: 5%)
- `is_active`: Whether this payment method is active

**Bank Charge Calculation Formula**:
```
base_fee = (amount_received × fee_percentage / 100) + fixed_fee_amount
bank_charge = base_fee × (1 + vat_percentage / 100)
net_amount = amount_received - bank_charge
```

**Example**: Payment of 7,000 AED via POS:
- POS settings: `fee_percentage: 1.9`, `fixed_fee_amount: null`, `vat_percentage: 5`
- `base_fee = 7000 × 1.9 / 100 = 133.00`
- `bank_charge = 133.00 × 1.05 = 139.65`
- `net_amount = 7000 - 139.65 = 6860.35`

### Package Usage Schema
The `package_usage` table tracks consumption:

- `payment_package_id`: Foreign key to package
- `appointment_id`: Foreign key to appointment (null for manual adjustments)
- `usage_type`: `session` or `hours`
- `quantity_used`: Amount consumed (1 for sessions, decimal for hours)
- `usage_date`: Date of usage
- `is_manual_adjustment`: Boolean (true for manual entries, false for auto-tracked)
- `notes`: Optional notes

### Installment Schedule Schema
The `installment_schedules` table tracks payment plans:

- `payment_package_id`: Foreign key to package
- `installment_number`: Sequential number (1, 2, 3, ...)
- `due_date`: When payment is due
- `amount_due`: Amount for this installment
- `is_paid`: Boolean flag
- `paid_date`: Date when paid (set automatically when transaction matches)
- `reminder_sent`: Boolean for reminder tracking

### How Finance Works

#### Creating a Payment Package

**Session-Based Package Example**:
- Client: John Doe
- Service: Physiotherapy
- Package Type: `session-based`
- Total Sessions: `10`
- Total Amount: `5,000 AED`
- Start Date: `2025-01-01`
- Result: Package with 10 sessions, each appointment consumes 1 session

**Time-Based Package Example**:
- Client: Jane Smith
- Service: Caregiver
- Package Type: `time-based`
- Total Amount: `7,000 AED`
- Duration Days: `30`
- Hours Per Day: `12`
- Total Hours: `360` (30 × 12)
- Price Per Hour: `19.44` (7000 / 360)
- Start Date: `2025-01-01`
- End Date: `2025-01-31`
- Result: Package with 360 hours, appointments consume actual hours used

#### Recording Payments

1. **Single Payment**:
   - Select payment package
   - Enter `amount_received` (e.g., 7,000 AED)
   - Select `payment_method` (e.g., POS)
   - System auto-calculates `bank_charge` using payment settings
   - System calculates `net_amount = amount_received - bank_charge`
   - Enter `date_paid` and `date_received`
   - Optionally add `invoice_number`

2. **Installment Payment**:
   - Create installment schedule first (e.g., 3 installments of 2,333.33 AED each)
   - When recording payment, specify `installment_number`
   - System automatically marks corresponding installment as paid when amount matches

#### Package Usage Tracking

**Automatic Tracking** (via database trigger):
- When appointment status changes to "completed" and `payment_package_id` is set:
  - **Session-based**: Creates `package_usage` record with `quantity_used: 1`, `usage_type: "session"`
  - **Time-based**: Calculates hours from appointment `start_time`/`end_time`, creates record with calculated hours, `usage_type: "hours"`
- If appointment is cancelled after completion, removes usage (session-based only)

**Manual Adjustments**:
- Staff can manually add usage records (e.g., for corrections or special cases)
- Marked with `is_manual_adjustment: true`
- Can add notes explaining the adjustment

#### Package Status Management

- **Active**: Package is active and can be used
- **Completed**: All sessions/hours have been consumed
- **Expired**: Package has passed its end date or renewal date

#### Package Renewal

When a package expires or is fully used, it can be renewed:
- System creates a new package with same or updated parameters
- Links new package to old package via `renewed_from_package_id`
- Maintains history of package renewals

### Finance Workflow Example

**Complete Example: Physiotherapy Package**

1. **Create Package**:
   - Client: John Doe
   - Type: `session-based`
   - Total Sessions: `10`
   - Total Amount: `5,000 AED`
   - Start Date: `2025-01-01`

2. **Record Payment**:
   - Amount Received: `5,000 AED`
   - Payment Method: `POS`
   - Bank Charge: `95.00 AED` (auto-calculated: 5000 × 1.9% × 1.05)
   - Net Amount: `4,905.00 AED`
   - Date Paid: `2025-01-01`

3. **Create Appointments**:
   - Appointment 1: Jan 5, 10:00 AM, linked to package → Status: `completed`
   - System auto-creates usage: 1 session used, 9 remaining
   - Appointment 2: Jan 8, 2:00 PM, linked to package → Status: `completed`
   - System auto-creates usage: 1 session used, 8 remaining
   - ... continues until all 10 sessions used

4. **Package Completion**:
   - When 10th session is completed, package status can be updated to `completed`
   - System shows: 10 sessions used, 0 remaining

---

## Database Schema Relationships

### Core Relationships

1. **Contacts (Clients) → Appointments**:
   - One-to-many: `contacts.id` → `appointments.patient_id`
   - A client can have many appointments

2. **Contacts (Clients) → Payment Packages**:
   - One-to-many: `contacts.id` → `payment_packages.patient_id`
   - A client can have many payment packages

3. **Appointments → Payment Packages**:
   - Many-to-one: `appointments.payment_package_id` → `payment_packages.id`
   - Many appointments can link to one package

4. **Appointments → Staff**:
   - Many-to-one: `appointments.primary_staff_id` → `staff.id`
   - Many-to-one: `appointments.driver_id` → `staff.id`
   - Many-to-many: `appointments.id` ↔ `appointment_staff_assignments` ↔ `staff.id`
   - One appointment can have multiple staff members

5. **Payment Packages → Payment Transactions**:
   - One-to-many: `payment_packages.id` → `payment_transactions.payment_package_id`
   - One package can have many payment transactions (installments)

6. **Payment Packages → Package Usage**:
   - One-to-many: `payment_packages.id` → `package_usage.payment_package_id`
   - One package can have many usage records

7. **Appointments → Package Usage**:
   - One-to-one (optional): `appointments.id` → `package_usage.appointment_id`
   - Usage records can optionally link to appointments

8. **Payment Packages → Installment Schedules**:
   - One-to-many: `payment_packages.id` → `installment_schedules.payment_package_id`
   - One package can have many installment schedule entries

### Recurring Appointments Relationship

- **Parent-Child Relationship**: All appointments in a recurring series share the same `recurrence_id` (UUID)
- **Parent Appointment**: Has `recurrence_sequence: 0` and stores `recurrence_config` in JSONB
- **Child Appointments**: Have `recurrence_sequence: 1, 2, 3, ...` and reference the same `recurrence_id`
- **Shared Data**: All appointments in a series share the same `patient_id`, `primary_staff_id`, `appointment_type`, `payment_package_id`, etc., but have different dates/times

### Key Database Functions

1. **`calculate_package_usage(package_id)`**: Returns JSONB with `sessions_used` and `hours_used` totals
2. **`calculate_hours_from_appointment(appointment_id)`**: Calculates decimal hours from appointment start/end times
3. **`calculate_bank_charge(amount, payment_method)`**: Calculates bank charge based on payment settings

### Key Database Triggers

1. **`update_package_usage_on_appointment_change`**: 
   - Fires when appointment status changes
   - Automatically creates/removes `package_usage` records based on appointment completion/cancellation
   - Handles both session-based and time-based packages

---

## Summary

The application manages:
- **Staff**: Healthcare professionals with different roles, assigned to appointments
- **Clients**: Patients with comprehensive contact and location information
- **Appointments**: Scheduled sessions with support for recurring patterns, multiple staff assignments, and payment package linking
- **Finance**: Payment packages (session/time-based), transactions with bank charge calculation, usage tracking, and installment plans

All components are interconnected: clients have appointments and packages, appointments consume packages, and payments fund packages. The system automatically tracks usage when appointments are completed, ensuring accurate package consumption monitoring.

