-- ============================================
-- Add Staff Members and Leads with Real Addresses
-- ============================================

-- Insert Staff Members
INSERT INTO "public"."staff" (first_name, last_name, staff_type, phone, email, status, specialization)
VALUES
    ('Ahmed', 'Al-Mansoori', 'Doctor', '+971501234567', 'ahmed.almansoori@bestdoc.ae', 'active', 'General Practitioner'),
    ('Fatima', 'Hassan', 'Nurse', '+971501234568', 'fatima.hassan@bestdoc.ae', 'active', 'Registered Nurse'),
    ('Mohammed', 'Ibrahim', 'Physiotherapist', '+971501234569', 'mohammed.ibrahim@bestdoc.ae', 'active', 'Sports Medicine'),
    ('Omar', 'Al-Rashid', 'Driver', '+971501234570', 'omar.alrashid@bestdoc.ae', 'active', NULL)
ON CONFLICT DO NOTHING;

-- Insert Leads (Contacts) with Real Dubai Addresses and Coordinates
-- Note: Using real Dubai locations with actual coordinates

-- Lead 1: Dubai Marina
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'Sarah',
    'Johnson',
    'Female',
    'Ms.',
    '[{"email": "sarah.johnson@email.com", "type": "Home"}]'::jsonb,
    '[{"number": "+971501111111", "type": "Home"}]'::jsonb,
    '1505',
    'Marina Tower 1',
    'Dubai Marina',
    'Dubai',
    25.0772,
    55.1394,
    'https://maps.google.com/?q=25.0772,55.1394',
    true,
    'new',
    NOW(),
    NOW(),
    false
);

-- Lead 2: Jumeirah
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'Michael',
    'Chen',
    'Male',
    'Mr.',
    '[{"email": "michael.chen@email.com", "type": "Work"}]'::jsonb,
    '[{"number": "+971502222222", "type": "Work"}]'::jsonb,
    'Villa 12',
    'Jumeirah Beach Road',
    'Jumeirah 1',
    'Dubai',
    25.1972,
    55.2278,
    'https://maps.google.com/?q=25.1972,55.2278',
    true,
    'new',
    NOW(),
    NOW(),
    true
);

-- Lead 3: Downtown Dubai (Burj Khalifa area)
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'Emma',
    'Williams',
    'Female',
    'Dr.',
    '[{"email": "emma.williams@email.com", "type": "Work"}]'::jsonb,
    '[{"number": "+971503333333", "type": "Work"}]'::jsonb,
    '2801',
    'Burj Khalifa',
    'Downtown Dubai',
    'Dubai',
    25.1972,
    55.2744,
    'https://maps.google.com/?q=25.1972,55.2744',
    true,
    'contacted',
    NOW() - INTERVAL '2 days',
    NOW(),
    false
);

-- Lead 4: Business Bay
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'David',
    'Kumar',
    'Male',
    'Mr.',
    '[{"email": "david.kumar@email.com", "type": "Home"}]'::jsonb,
    '[{"number": "+971504444444", "type": "Home"}]'::jsonb,
    '1203',
    'Business Bay Tower',
    'Business Bay',
    'Dubai',
    25.1868,
    55.2668,
    'https://maps.google.com/?q=25.1868,55.2668',
    true,
    'new',
    NOW(),
    NOW(),
    false
);

-- Lead 5: Palm Jumeirah
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'Sophia',
    'Martinez',
    'Female',
    'Ms.',
    '[{"email": "sophia.martinez@email.com", "type": "Home"}]'::jsonb,
    '[{"number": "+971505555555", "type": "Home"}]'::jsonb,
    'Villa 45',
    'Palm Jumeirah',
    'Palm Jumeirah',
    'Dubai',
    25.1121,
    55.1390,
    'https://maps.google.com/?q=25.1121,55.1390',
    true,
    'qualified',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '1 day',
    true
);

-- Lead 6: JBR (Jumeirah Beach Residence)
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'James',
    'Anderson',
    'Male',
    'Mr.',
    '[{"email": "james.anderson@email.com", "type": "Work"}]'::jsonb,
    '[{"number": "+971506666666", "type": "Work"}]'::jsonb,
    '804',
    'JBR Tower 1',
    'Jumeirah Beach Residence',
    'Dubai',
    25.0784,
    55.1378,
    'https://maps.google.com/?q=25.0784,55.1378',
    true,
    'new',
    NOW(),
    NOW(),
    false
);

-- Lead 7: Dubai Hills
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'Olivia',
    'Brown',
    'Female',
    'Mrs.',
    '[{"email": "olivia.brown@email.com", "type": "Home"}]'::jsonb,
    '[{"number": "+971507777777", "type": "Home"}]'::jsonb,
    'Villa 88',
    'Dubai Hills Estate',
    'Dubai Hills',
    'Dubai',
    25.0600,
    55.1800,
    'https://maps.google.com/?q=25.0600,55.1800',
    true,
    'contacted',
    NOW() - INTERVAL '3 days',
    NOW(),
    true
);

-- Lead 8: DIFC (Dubai International Financial Centre)
INSERT INTO "public"."contacts" (
    first_name, 
    last_name, 
    gender, 
    title,
    email_jsonb,
    phone_jsonb,
    flat_villa_number,
    building_street,
    area,
    city,
    latitude,
    longitude,
    google_maps_link,
    phone_has_whatsapp,
    status,
    first_seen,
    last_seen,
    has_newsletter
)
VALUES (
    'Robert',
    'Taylor',
    'Male',
    'Mr.',
    '[{"email": "robert.taylor@email.com", "type": "Work"}]'::jsonb,
    '[{"number": "+971508888888", "type": "Work"}]'::jsonb,
    '3502',
    'Emirates Towers',
    'DIFC',
    'Dubai',
    25.2144,
    55.2794,
    'https://maps.google.com/?q=25.2144,55.2794',
    true,
    'qualified',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '2 days',
    false
);

