-- Chat Sessions Table
create table if not exists chat_sessions (
  id text primary key, -- using text to match frontend generated IDs (e.g., 'chat-uuid') or uuid
  project_id uuid references projects(id) on delete cascade not null,
  selected_model text default 'gemini-2.5-flash',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id) -- One session per project for now as per current store logic
);

-- Messages Table
create table if not exists messages (
  id text primary key, -- timestamp string or uuid
  session_id text references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'model', 'system')),
  content text not null,
  timestamp bigint not null, -- storing JS timestamp
  created_at timestamptz default now()
);

-- RLS Policies

-- Chat Sessions
alter table chat_sessions enable row level security;

create policy "Users can view sessions of own projects"
on chat_sessions for select
using (
  exists (
    select 1 from projects
    where projects.id = chat_sessions.project_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can insert sessions to own projects"
on chat_sessions for insert
with check (
  exists (
    select 1 from projects
    where projects.id = chat_sessions.project_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can update sessions of own projects"
on chat_sessions for update
using (
  exists (
    select 1 from projects
    where projects.id = chat_sessions.project_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can delete sessions of own projects"
on chat_sessions for delete
using (
  exists (
    select 1 from projects
    where projects.id = chat_sessions.project_id
    and projects.user_id = auth.uid()
  )
);

-- Messages
alter table messages enable row level security;

create policy "Users can view messages of own projects"
on messages for select
using (
  exists (
    select 1 from chat_sessions
    join projects on projects.id = chat_sessions.project_id
    where chat_sessions.id = messages.session_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can insert messages to own projects"
on messages for insert
with check (
  exists (
    select 1 from chat_sessions
    join projects on projects.id = chat_sessions.project_id
    where chat_sessions.id = messages.session_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can delete messages of own projects"
on messages for delete
using (
  exists (
    select 1 from chat_sessions
    join projects on projects.id = chat_sessions.project_id
    where chat_sessions.id = messages.session_id
    and projects.user_id = auth.uid()
  )
);
