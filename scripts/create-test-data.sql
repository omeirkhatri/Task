-- ============================================
-- Create Test Clients, Leads, and Staff Data
-- Run this script against your LOCAL Supabase database
-- ============================================

-- 1. Ensure tables exist (they should from migrations, but just in case)
-- This assumes migrations have already been applied

-- 2. Insert default services if they don't exist
INSERT INTO "public"."services" (name)
SELECT * FROM (VALUES 
    ('Doctor on Call'),
    ('Teleconsultation'),
    ('Physiotherapy'),
    ('Nurse on Call'),
    ('Blood Test'),
    ('IV Therapy'),
    ('Nanny'),
    ('Elderly Care')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM "public"."services" LIMIT 1)
ON CONFLICT DO NOTHING;

-- 3. Insert 5 Companies (Clients) with comprehensive test data
DO $$
DECLARE
    service_doctor_id bigint;
    service_physio_id bigint;
    service_nurse_id bigint;
    service_blood_id bigint;
    service_iv_id bigint;
    company1_id bigint;
    company2_id bigint;
    company3_id bigint;
    company4_id bigint;
    company5_id bigint;
BEGIN
    -- Get service IDs
    SELECT id INTO service_doctor_id FROM "public"."services" WHERE name = 'Doctor on Call' LIMIT 1;
    SELECT id INTO service_physio_id FROM "public"."services" WHERE name = 'Physiotherapy' LIMIT 1;
    SELECT id INTO service_nurse_id FROM "public"."services" WHERE name = 'Nurse on Call' LIMIT 1;
    SELECT id INTO service_blood_id FROM "public"."services" WHERE name = 'Blood Test' LIMIT 1;
    SELECT id INTO service_iv_id FROM "public"."services" WHERE name = 'IV Therapy' LIMIT 1;

    -- Insert Company 1: Test Healthcare Solutions LLC
    INSERT INTO "public"."companies" (
        name, sector, size, website, phone_number, address, zipcode, city, 
        "stateAbbr", country, description, revenue, tax_identifier, services
    ) VALUES (
        'Test Healthcare Solutions LLC', 'Healthcare & Medical Services', 50, 
        'https://testhealthcare.ae', '+971 4 123 4567',
        'Villa 123, Al Wasl Road, Jumeirah 1', '12345', 'Dubai', 'DXB', 'United Arab Emirates',
        'Test Healthcare Solutions LLC is a leading provider of comprehensive healthcare services in Dubai. Established in 2018, we employ 50 dedicated healthcare professionals including 15 doctors, 20 nurses, 10 administrative staff, and 5 support personnel. Our services include home care, telemedicine consultations, and emergency medical response. We serve over 500 active patients monthly and have partnerships with major hospitals in the UAE.',
        'AED 5,000,000', 'TRN-100123456789',
        ARRAY[service_doctor_id, service_nurse_id]::bigint[]
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO company1_id FROM "public"."companies" WHERE name = 'Test Healthcare Solutions LLC' LIMIT 1;

    -- Insert Company 2: Test Physiotherapy & Rehabilitation Center
    INSERT INTO "public"."companies" (
        name, sector, size, website, phone_number, address, zipcode, city, 
        "stateAbbr", country, description, revenue, tax_identifier, services
    ) VALUES (
        'Test Physiotherapy & Rehabilitation Center', 'Medical Services - Rehabilitation', 30,
        'https://testphysio.ae', '+971 4 234 5678',
        'Building 456, Sheikh Zayed Road, Trade Centre', '23456', 'Dubai', 'DXB', 'United Arab Emirates',
        'Test Physiotherapy & Rehabilitation Center specializes in sports medicine and physical rehabilitation. Our team consists of 30 professionals: 8 licensed physiotherapists, 12 therapy assistants, 5 administrative staff, and 5 facility maintenance personnel. We operate a state-of-the-art facility with 15 treatment rooms, hydrotherapy pool, and modern equipment. We treat over 200 patients weekly for sports injuries, post-surgical rehabilitation, and chronic pain management.',
        'AED 3,000,000', 'TRN-100234567890',
        ARRAY[service_physio_id]::bigint[]
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO company2_id FROM "public"."companies" WHERE name = 'Test Physiotherapy & Rehabilitation Center' LIMIT 1;

    -- Insert Company 3: Test Medical Diagnostics & Lab Services
    INSERT INTO "public"."companies" (
        name, sector, size, website, phone_number, address, zipcode, city, 
        "stateAbbr", country, description, revenue, tax_identifier, services
    ) VALUES (
        'Test Medical Diagnostics & Lab Services', 'Healthcare - Laboratory Services', 75,
        'https://testdiagnostics.ae', '+971 4 345 6789',
        'Apartment 789, Jumeirah Beach Road, Jumeirah 3', '34567', 'Dubai', 'DXB', 'United Arab Emirates',
        'Test Medical Diagnostics is a comprehensive medical laboratory and diagnostic center. We employ 75 staff members including 20 drivers, 15 phlebotomists, 10 doctors (pathologists and radiologists), 20 administrative and customer service staff, and 10 logistics/delivery personnel. Our facility processes over 1,000 lab tests daily including blood tests, IV therapy administration, imaging services, and specialized diagnostic procedures. We serve both individual patients and corporate clients.',
        'AED 7,500,000', 'TRN-100345678901',
        ARRAY[service_blood_id, service_iv_id, service_doctor_id]::bigint[]
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO company3_id FROM "public"."companies" WHERE name = 'Test Medical Diagnostics & Lab Services' LIMIT 1;

    -- Insert Company 4: Test Home Care & Elderly Services
    INSERT INTO "public"."companies" (
        name, sector, size, website, phone_number, address, zipcode, city, 
        "stateAbbr", country, description, revenue, tax_identifier, services
    ) VALUES (
        'Test Home Care & Elderly Services', 'Home Care Services', 25,
        'https://testhomecare.ae', '+971 4 456 7890',
        'Villa 321, Al Barsha South, Al Barsha 1', '45678', 'Dubai', 'DXB', 'United Arab Emirates',
        'Test Home Care & Elderly Services provides compassionate in-home care for elderly patients and families. Our team of 25 professionals includes 12 certified caregivers, 5 registered nurses, 3 care coordinators, and 5 administrative staff. We specialize in elderly care, post-operative home care, chronic disease management, and nanny services. We currently serve 150+ families across Dubai with 24/7 availability and personalized care plans tailored to each patient''s needs.',
        'AED 2,500,000', 'TRN-100456789012',
        ARRAY[service_nurse_id]::bigint[]
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO company4_id FROM "public"."companies" WHERE name = 'Test Home Care & Elderly Services' LIMIT 1;

    -- Insert Company 5: Test Integrated Medical Services
    INSERT INTO "public"."companies" (
        name, sector, size, website, phone_number, address, zipcode, city, 
        "stateAbbr", country, description, revenue, tax_identifier, services
    ) VALUES (
        'Test Integrated Medical Services', 'Medical Services - Multi-Specialty', 40,
        'https://testintegrated.ae', '+971 4 567 8901',
        'Office 654, Business Bay, Dubai Marina', '56789', 'Dubai', 'DXB', 'United Arab Emirates',
        'Test Integrated Medical Services is a full-service medical provider offering comprehensive healthcare solutions. Our organization employs 40 professionals: 12 doctors across various specialties, 15 nurses, 8 administrative staff, and 5 support personnel. We provide teleconsultation services, home visits, physiotherapy, nursing care, and preventive health screenings. We serve corporate clients with employee health programs and individual patients requiring ongoing medical management. Our services are available 24/7 with same-day appointment availability.',
        'AED 4,000,000', 'TRN-100567890123',
        ARRAY[service_doctor_id, service_physio_id, service_nurse_id]::bigint[]
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO company5_id FROM "public"."companies" WHERE name = 'Test Integrated Medical Services' LIMIT 1;

    -- Insert Contacts (Leads) linked to companies
    INSERT INTO "public"."contacts" (
        first_name, last_name, gender, title, email_jsonb, phone_jsonb,
        flat_villa_number, building_street, area, google_maps_link,
        phone_has_whatsapp, services_interested, description, background,
        first_seen, last_seen, has_newsletter, status, tags, company_id
    ) VALUES
    (
        'Ahmed', 'Al Mansouri', 'Male', 'Mr.', 
        '[{"email": "ahmed.almansouri@testhealthcare.ae", "type": "Work"}]'::jsonb,
        '[{"number": "+971501111111", "type": "Work"}, {"number": "+971502222222", "type": "Mobile"}]'::jsonb,
        'Villa 123', 'Al Wasl Road', 'Jumeirah 1',
        'https://maps.google.com/?q=25.2048,55.2708',
        true,
        ARRAY[service_doctor_id, service_nurse_id]::bigint[],
        'Primary contact for Test Healthcare Solutions. Operations Manager with 10+ years experience in healthcare administration. Responsible for coordinating home care services and managing patient relationships.',
        'Experienced healthcare administrator with MBA in Healthcare Management. Previously worked at major hospitals in Dubai. Fluent in Arabic and English.',
        NOW(), NOW(), true, 'Active', ARRAY[]::bigint[], company1_id
    ),
    (
        'Dr. Sarah', 'Johnson', 'Female', 'Dr.', 
        '[{"email": "sarah.johnson@testphysio.ae", "type": "Work"}]'::jsonb,
        '[{"number": "+971503333333", "type": "Work"}]'::jsonb,
        'Building 456', 'Sheikh Zayed Road', 'Trade Centre',
        'https://maps.google.com/?q=25.2048,55.2708',
        true,
        ARRAY[service_physio_id]::bigint[],
        'Lead contact for Test Physiotherapy Center. Licensed physiotherapist and clinic director. Specializes in sports rehabilitation and orthopedic physical therapy.',
        'Medical professional with Doctorate in Physical Therapy from UK. 15 years of experience treating athletes and post-surgical patients. Certified in sports medicine.',
        NOW(), NOW(), false, 'Active', ARRAY[]::bigint[], company2_id
    ),
    (
        'Mohammed', 'Al Zahra', 'Male', 'Mr.', 
        '[{"email": "mohammed.alzahra@testdiagnostics.ae", "type": "Work"}, {"email": "m.alzahra.personal@gmail.com", "type": "Home"}]'::jsonb,
        '[{"number": "+971504444444", "type": "Work"}, {"number": "+971505555555", "type": "Mobile"}]'::jsonb,
        'Apartment 789', 'Jumeirah Beach Road', 'Jumeirah 3',
        'https://maps.google.com/?q=25.2048,55.2708',
        true,
        ARRAY[service_blood_id, service_iv_id, service_doctor_id]::bigint[],
        'Main contact for Test Medical Diagnostics. Laboratory Director overseeing daily operations. Manages team of 75 staff and coordinates with corporate clients for employee health programs.',
        'Business owner and laboratory director with PhD in Clinical Laboratory Science. Established the diagnostic center in 2015. Expert in laboratory management and quality assurance.',
        NOW(), NOW(), true, 'Active', ARRAY[]::bigint[], company3_id
    ),
    (
        'Fatima', 'Al Rashid', 'Female', 'Mrs.', 
        '[{"email": "fatima.alrashid@testhomecare.ae", "type": "Work"}]'::jsonb,
        '[{"number": "+971506666666", "type": "Work"}]'::jsonb,
        'Villa 321', 'Al Barsha South', 'Al Barsha 1',
        'https://maps.google.com/?q=25.2048,55.2708',
        false,
        ARRAY[service_nurse_id]::bigint[],
        'Contact person for Test Home Care Services. Care Coordinator responsible for matching caregivers with families and managing care schedules. Specializes in elderly care coordination.',
        'Healthcare coordinator with BSN degree and 8 years of experience in home care management. Strong background in patient care coordination and family support services.',
        NOW(), NOW(), false, 'Active', ARRAY[]::bigint[], company4_id
    ),
    (
        'Hassan', 'Al Maktoum', 'Male', 'Mr.', 
        '[{"email": "hassan.almaktoum@testintegrated.ae", "type": "Work"}]'::jsonb,
        '[{"number": "+971507777777", "type": "Work"}]'::jsonb,
        'Office 654', 'Business Bay', 'Dubai Marina',
        'https://maps.google.com/?q=25.2048,55.2708',
        true,
        ARRAY[service_doctor_id, service_physio_id, service_nurse_id]::bigint[],
        'Primary lead for Test Integrated Medical Services. Operations Manager seeking comprehensive healthcare solutions for corporate employee wellness programs. Interested in teleconsultation and preventive health services.',
        'Operations manager with 12 years of experience in corporate health management. Currently managing employee wellness programs for a multinational company with 500+ employees in Dubai.',
        NOW(), NOW(), true, 'Active', ARRAY[]::bigint[], company5_id
    )
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Insert 5 Staff Members (matching local schema: bigint id, text status, no available_days/working_hours)
INSERT INTO "public"."staff" (
    first_name, last_name, staff_type, specialization, phone, email, status
) VALUES
(
    'Doctor', 'Doctor', 'doctor', 'General Medicine', '+971501111111', 'doctor@example.com', 'active'
),
(
    'Physiotherapist', 'Physiotherapist', 'physiotherapist', 'Sports Rehabilitation', '+971502222222', 'physiotherapist@example.com', 'active'
),
(
    'Nurse', 'Nurse', 'nurse', 'Critical Care', '+971503333333', 'nurse@example.com', 'active'
),
(
    'Caregiver', 'Caregiver', 'caregiver', 'Elderly Care', '+971504444444', 'caregiver@example.com', 'active'
),
(
    'Driver', 'Driver', 'driver', 'Transportation', '+971505555555', 'driver@example.com', 'active'
)
ON CONFLICT DO NOTHING;

