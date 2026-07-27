-- Migration 009: community reports
create table if not exists community_reports (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('community', 'comment')),
  reason        text not null,
  note          text,
  status        text not null default 'pending'
                  check (status in ('pending', 'owner_actioned', 'escalated', 'admin_resolved', 'dismissed')),
  -- what was reported
  community_id  uuid references communities(id) on delete cascade,
  comment_id    uuid references comments(id)    on delete cascade,
  -- who reported
  reporter_id   uuid references profiles(id)    on delete set null,
  -- owner action fields
  owner_action  text check (owner_action in ('deleted', 'warned', 'dismissed', 'escalated')),
  owner_note    text,
  owner_actioned_at timestamptz,
  -- admin action fields
  admin_note    text,
  admin_actioned_at timestamptz,
  created_at    timestamptz default now()
);

create index if not exists community_reports_community_idx on community_reports(community_id);
create index if not exists community_reports_status_idx    on community_reports(status);

-- RLS
alter table community_reports enable row level security;

-- Anyone authenticated can insert a report
create policy "authenticated can report"
  on community_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Community owner can read reports for their community
create policy "owner can read community reports"
  on community_reports for select
  to authenticated
  using (
    community_id in (
      select id from communities where created_by = auth.uid()
    )
  );

-- Community owner can update status/action on comment reports for their community
create policy "owner can action comment reports"
  on community_reports for update
  to authenticated
  using (
    type = 'comment'
    and community_id in (
      select id from communities where created_by = auth.uid()
    )
  );
