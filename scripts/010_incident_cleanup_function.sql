-- Function to delete expired incidents and their media from storage
CREATE OR REPLACE FUNCTION delete_expired_incidents()
RETURNS void AS $$
DECLARE
  v_incident record;
  v_media record;
BEGIN
  -- Find expired incidents
  FOR v_incident IN
    SELECT i.id, i.created_at, 
           EXISTS(SELECT 1 FROM user_subscriptions us WHERE us.user_id = i.created_by AND us.expires_at > now()) as is_subscribed
    FROM incidents i
    WHERE 
      -- Unsubscribed users: 7 days
      (NOT EXISTS(SELECT 1 FROM user_subscriptions us WHERE us.user_id = i.created_by AND us.expires_at > now()) 
       AND i.created_at < now() - interval '7 days')
      OR
      -- Subscribed users: 30 days
      (EXISTS(SELECT 1 FROM user_subscriptions us WHERE us.user_id = i.created_by AND us.expires_at > now()) 
       AND i.created_at < now() - interval '30 days')
  LOOP
    -- Delete media files from storage (will be handled by storage policies/triggers)
    FOR v_media IN
      SELECT path FROM incident_media WHERE incident_id = v_incident.id
    LOOP
      -- Storage deletion will be triggered by the DELETE CASCADE
      NULL;
    END LOOP;
    
    -- Delete incident (CASCADE will handle related tables)
    DELETE FROM incidents WHERE id = v_incident.id;
    
    RAISE NOTICE 'Deleted expired incident: %', v_incident.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job comment for reference
COMMENT ON FUNCTION delete_expired_incidents() IS 'Run this function via Supabase cron or pg_cron daily: SELECT cron.schedule(''delete-expired-incidents'', ''0 2 * * *'', ''SELECT delete_expired_incidents();'');';
