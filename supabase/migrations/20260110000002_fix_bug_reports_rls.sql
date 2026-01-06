-- ============================================
-- Fix Bug Reports RLS Policies
-- ============================================
-- This migration fixes the RLS policies to allow status updates

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can update their own open bug reports" ON "public"."bug_reports";

-- Create a new policy that allows users to update their own bug reports regardless of status
CREATE POLICY "Users can update their own bug reports"
    ON "public"."bug_reports"
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = (SELECT user_id FROM sales WHERE id = reported_by LIMIT 1)
    )
    WITH CHECK (
        auth.uid() = (SELECT user_id FROM sales WHERE id = reported_by LIMIT 1)
    );

-- Ensure the general status update policy exists
DROP POLICY IF EXISTS "Users can update bug report status" ON "public"."bug_reports";
CREATE POLICY "Users can update bug report status"
    ON "public"."bug_reports"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

