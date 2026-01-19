-- Just create/replace the increment function (table and policies already exist)
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
