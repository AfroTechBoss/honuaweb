-- ============================================================
-- Messages system
-- ============================================================

create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  user1_id      uuid not null references public.profiles(id) on delete cascade,
  user2_id      uuid not null references public.profiles(id) on delete cascade,
  -- 'accepted' = normal chat, 'pending' = message request
  status        text not null default 'pending' check (status in ('pending','accepted')),
  accepted_by   uuid references public.profiles(id),
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),
  unique(user1_id, user2_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null,
  seen_at         timestamptz,   -- null until recipient views AND convo is accepted
  created_at      timestamptz not null default now()
);

-- indexes
create index if not exists messages_conv_created on public.messages(conversation_id, created_at);
create index if not exists conversations_user1 on public.conversations(user1_id);
create index if not exists conversations_user2 on public.conversations(user2_id);

-- RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: only participants can see/update their own rows
create policy "conv_select" on public.conversations for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "conv_insert" on public.conversations for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "conv_update" on public.conversations for update
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Messages: visible to both participants of the conversation
create policy "msg_select" on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

create policy "msg_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

create policy "msg_update" on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
