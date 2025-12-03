-- Enable pgvector extension to work with embeddings
create extension if not exists vector;

-- Projects Table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat Chunks Table (Stores text chunks + embeddings)
create table if not exists chat_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  content text not null,
  embedding vector(384), -- Using 384 dim for standard small HF models (e.g. all-MiniLM-L6-v2)
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Create an index for faster similarity search
create index on chat_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- API Keys Table (Encrypted storage)
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  provider text not null, -- 'openai', 'anthropic', 'huggingface', etc.
  encrypted_key text not null,
  iv text not null, -- Initialization vector for encryption
  created_at timestamptz default now(),
  unique(user_id, provider)
);

-- RLS Policies

-- Projects: Users can only see/edit their own projects
alter table projects enable row level security;

create policy "Users can view own projects"
on projects for select
using (auth.uid() = user_id);

create policy "Users can insert own projects"
on projects for insert
with check (auth.uid() = user_id);

create policy "Users can update own projects"
on projects for update
using (auth.uid() = user_id);

create policy "Users can delete own projects"
on projects for delete
using (auth.uid() = user_id);

-- Chat Chunks: Users can only access chunks via projects they own
alter table chat_chunks enable row level security;

create policy "Users can view chunks of own projects"
on chat_chunks for select
using (
  exists (
    select 1 from projects
    where projects.id = chat_chunks.project_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can insert chunks to own projects"
on chat_chunks for insert
with check (
  exists (
    select 1 from projects
    where projects.id = chat_chunks.project_id
    and projects.user_id = auth.uid()
  )
);

create policy "Users can delete chunks of own projects"
on chat_chunks for delete
using (
  exists (
    select 1 from projects
    where projects.id = chat_chunks.project_id
    and projects.user_id = auth.uid()
  )
);

-- API Keys: Users can only manage their own keys
alter table api_keys enable row level security;

create policy "Users can view own api keys"
on api_keys for select
using (auth.uid() = user_id);

create policy "Users can insert own api keys"
on api_keys for insert
with check (auth.uid() = user_id);

create policy "Users can update own api keys"
on api_keys for update
using (auth.uid() = user_id);

create policy "Users can delete own api keys"
on api_keys for delete
using (auth.uid() = user_id);
