-- Enable Supabase Realtime for tables that need live updates.
-- Without this, postgres_changes subscriptions receive nothing.
-- Run in Supabase Dashboard → SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reposts;

-- Also enable full row data on DELETE so we get the old row's post_id
-- (needed for the repost/like decrement in the Realtime handler)
ALTER TABLE public.post_likes    REPLICA IDENTITY FULL;
ALTER TABLE public.post_reposts  REPLICA IDENTITY FULL;
