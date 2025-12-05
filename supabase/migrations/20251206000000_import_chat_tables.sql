-- Add import_count to profiles
alter table profiles 
add column if not exists import_count int default 0;

-- Imported Chats Table
create table if not exists imported_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  provider text not null, -- 'chatgpt', 'gemini', 'other'
  source_url text,
  title text,
  summary_short text,
  summary_long text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Imported Messages Table
create table if not exists imported_messages (
  id uuid primary key default gen_random_uuid(),
  imported_chat_id uuid references imported_chats(id) on delete cascade not null,
  role text not null, -- 'user', 'model', 'system'
  content text not null,
  original_index int, -- To preserve order
  created_at timestamptz default now()
);

-- RLS Policies
alter table imported_chats enable row level security;
alter table imported_messages enable row level security;

-- Imported Chats Policies
create policy "Users can view own imported chats"
  on imported_chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own imported chats"
  on imported_chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own imported chats"
  on imported_chats for update
  using (auth.uid() = user_id);

create policy "Users can delete own imported chats"
  on imported_chats for delete
  using (auth.uid() = user_id);

-- Imported Messages Policies
create policy "Users can view messages of own imported chats"
  on imported_messages for select
  using (
    exists (
      select 1 from imported_chats
      where imported_chats.id = imported_messages.imported_chat_id
      and imported_chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages to own imported chats"
  on imported_messages for insert
  with check (
    exists (
      select 1 from imported_chats
      where imported_chats.id = imported_messages.imported_chat_id
      and imported_chats.user_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists idx_imported_chats_user_id on imported_chats(user_id);
create index if not exists idx_imported_messages_chat_id on imported_messages(imported_chat_id);
