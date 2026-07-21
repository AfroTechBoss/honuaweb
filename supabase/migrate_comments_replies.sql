-- Add parent_id for threaded replies
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

-- Join profile on comments
-- (no schema change needed, profiles is already referenced via user_id)

-- Trigger: keep posts.comments_count accurate (all comments + replies)
create or replace function update_post_comments_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set comments_count = greatest(0, comments_count + 1) where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_post_comments_count on public.comments;
create trigger trg_post_comments_count
after insert or delete on public.comments
for each row execute function update_post_comments_count();

-- Back-fill existing counts
update posts p set
  comments_count = (select count(*) from comments where post_id = p.id);
