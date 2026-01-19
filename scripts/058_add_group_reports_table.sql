-- Create group_reports table to track which users have reported which groups
CREATE TABLE IF NOT EXISTS group_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reason TEXT,
    UNIQUE(group_id, user_id)  -- Each user can only report a group once
);

-- Enable RLS
ALTER TABLE group_reports ENABLE ROW LEVEL SECURITY;

-- Policies for group_reports
-- Members can report a group (only once)
CREATE POLICY "members_can_report_groups" ON group_reports
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_reports.group_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'approved'
        )
    );

-- Users can see their own reports
CREATE POLICY "users_view_own_reports" ON group_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create function to report a group (increments negative_reports)
CREATE OR REPLACE FUNCTION report_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_member BOOLEAN;
    v_already_reported BOOLEAN;
    v_new_count INTEGER;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if user is a member of the group
    SELECT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id
        AND user_id = v_user_id
        AND status = 'approved'
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RETURN jsonb_build_object('success', false, 'error', 'You must be a member to report this group');
    END IF;
    
    -- Check if user has already reported this group
    SELECT EXISTS (
        SELECT 1 FROM group_reports
        WHERE group_id = p_group_id
        AND user_id = v_user_id
    ) INTO v_already_reported;
    
    IF v_already_reported THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already reported this group');
    END IF;
    
    -- Insert the report
    INSERT INTO group_reports (group_id, user_id)
    VALUES (p_group_id, v_user_id);
    
    -- Increment the negative_reports count
    UPDATE groups
    SET negative_reports = COALESCE(negative_reports, 0) + 1
    WHERE id = p_group_id
    RETURNING negative_reports INTO v_new_count;
    
    RETURN jsonb_build_object('success', true, 'new_count', v_new_count);
END;
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_reports_group_id ON group_reports(group_id);
CREATE INDEX IF NOT EXISTS idx_group_reports_user_id ON group_reports(user_id);

-- Simple function to increment group reports
CREATE OR REPLACE FUNCTION increment_group_reports(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE groups
    SET negative_reports = COALESCE(negative_reports, 0) + 1
    WHERE id = p_group_id;
END;
$$;
