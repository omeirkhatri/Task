-- Migration: Auto-update package status when usage reaches total
-- This trigger automatically marks a package as 'completed' when all sessions/hours are used

-- Function to check and update package status based on usage
CREATE OR REPLACE FUNCTION update_package_status_on_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    package_record payment_packages%ROWTYPE;
    usage_data jsonb;
    sessions_used numeric := 0;
    hours_used numeric := 0;
BEGIN
    -- Get package details
    SELECT * INTO package_record
    FROM payment_packages
    WHERE id = NEW.payment_package_id;

    -- If package not found or already completed/expired, exit
    IF NOT FOUND OR package_record.status != 'active' THEN
        RETURN NEW;
    END IF;

    -- Calculate current usage
    usage_data := calculate_package_usage(NEW.payment_package_id);
    sessions_used := COALESCE((usage_data->>'sessions_used')::numeric, 0);
    hours_used := COALESCE((usage_data->>'hours_used')::numeric, 0);

    -- Check if package is fully used
    IF package_record.package_type = 'session-based' AND package_record.total_sessions IS NOT NULL THEN
        -- For session-based packages: check if sessions_used >= total_sessions
        IF sessions_used >= package_record.total_sessions THEN
            UPDATE payment_packages
            SET status = 'completed',
                updated_at = now()
            WHERE id = NEW.payment_package_id;
        END IF;
    ELSIF package_record.package_type = 'time-based' AND package_record.total_hours IS NOT NULL THEN
        -- For time-based packages: check if hours_used >= total_hours
        IF hours_used >= package_record.total_hours THEN
            UPDATE payment_packages
            SET status = 'completed',
                updated_at = now()
            WHERE id = NEW.payment_package_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on package_usage table
-- This fires after INSERT or UPDATE on package_usage
DROP TRIGGER IF EXISTS update_package_status_on_usage_trigger ON "public"."package_usage";

CREATE TRIGGER update_package_status_on_usage_trigger
    AFTER INSERT OR UPDATE ON "public"."package_usage"
    FOR EACH ROW
    EXECUTE FUNCTION update_package_status_on_usage();

