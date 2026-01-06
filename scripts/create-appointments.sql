-- ============================================
-- Create Appointments for Leads
-- ============================================
-- Creates 3 appointments per day from Jan 1-3, 2025 (1pm-5pm each day)
-- Each appointment is 60 minutes

DO $$
DECLARE
    contact_record RECORD;
    doctor_id bigint;
    nurse_id bigint;
    physio_id bigint;
    driver_id bigint;
    appointment_date date;
    start_hour int;
    start_minute int;
    appointment_times text[] := ARRAY['13:00', '14:30', '16:00']; -- 1pm, 2:30pm, 4pm
    time_slot text;
    start_ts timestamp with time zone;
    end_ts timestamp with time zone;
    contact_ids bigint[];
    contact_idx int := 0;
    day_num int;
BEGIN
    -- Get staff IDs
    SELECT id INTO doctor_id FROM staff WHERE staff_type = 'Doctor' LIMIT 1;
    SELECT id INTO nurse_id FROM staff WHERE staff_type = 'Nurse' LIMIT 1;
    SELECT id INTO physio_id FROM staff WHERE staff_type = 'Physiotherapist' LIMIT 1;
    SELECT id INTO driver_id FROM staff WHERE staff_type = 'Driver' LIMIT 1;
    
    -- Get all contact IDs
    SELECT ARRAY_AGG(id ORDER BY id) INTO contact_ids
    FROM contacts
    WHERE archived_at IS NULL;
    
    -- Create appointments for Jan 1, 2, 3
    FOR day_num IN 1..3 LOOP
        appointment_date := '2025-01-' || LPAD(day_num::text, 2, '0');
        
        -- Create 3 appointments per day
        FOR slot_idx IN 1..3 LOOP
            time_slot := appointment_times[slot_idx];
            contact_idx := contact_idx + 1;
            
            -- Cycle through contacts if we run out
            IF contact_idx > array_length(contact_ids, 1) THEN
                contact_idx := 1;
            END IF;
            
            -- Parse time slot (HH:MM format) - Dubai is UTC+4
            -- Create timestamp in Dubai timezone, then convert to UTC for storage
            start_ts := ((appointment_date || ' ' || time_slot || ':00')::timestamp AT TIME ZONE 'Asia/Dubai')::timestamp with time zone;
            end_ts := start_ts + INTERVAL '60 minutes';
            
            -- Insert appointment
            INSERT INTO appointments (
                patient_id,
                appointment_date,
                start_time,
                end_time,
                duration_minutes,
                appointment_type,
                status,
                primary_staff_id,
                driver_id,
                notes,
                created_at,
                updated_at
            ) VALUES (
                contact_ids[contact_idx],
                appointment_date,
                start_ts,
                end_ts,
                60,
                CASE 
                    WHEN slot_idx = 1 THEN 'doctor_on_call'
                    WHEN slot_idx = 2 THEN 'physiotherapy'
                    ELSE 'teleconsultation'
                END,
                'scheduled',
                CASE 
                    WHEN slot_idx = 1 THEN doctor_id
                    WHEN slot_idx = 2 THEN physio_id
                    ELSE doctor_id
                END,
                driver_id, -- Assign driver to all appointments
                'Appointment scheduled for ' || appointment_date || ' at ' || time_slot,
                NOW(),
                NOW()
            );
        END LOOP;
    END LOOP;
END $$;

