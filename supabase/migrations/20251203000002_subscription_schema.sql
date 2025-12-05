-- Create profiles table
create type subscription_plan as enum ('free', 'pro', 'enterprise');

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  plan subscription_plan default 'free'::subscription_plan,
  credits int default 300,
  monthly_project_creations int default 0,
  last_reset_date timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for profiles
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan, credits, monthly_project_creations)
  values (new.id, 'free', 300, 0);
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists to avoid conflicts/duplication
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to check project limits
create or replace function check_project_limits()
returns trigger as $$
declare
  user_plan subscription_plan;
  current_creations int;
  last_reset timestamptz;
  active_projects int;
begin
  -- Get user profile data
  select plan, monthly_project_creations, last_reset_date
  into user_plan, current_creations, last_reset
  from profiles
  where id = auth.uid();

  -- Handle monthly reset
  if last_reset < (now() - interval '1 month') then
    update profiles
    set monthly_project_creations = 0,
        last_reset_date = now()
    where id = auth.uid();
    current_creations := 0;
  end if;

  -- Check limits for Free plan
  if user_plan = 'free' then
    -- Check total active projects (assuming we count all rows in projects table for now)
    select count(*) into active_projects
    from projects
    where user_id = auth.uid();

    if active_projects >= 3 then
      raise exception 'Free plan limit reached: Maximum 3 active projects allowed.';
    end if;

    -- Check monthly creations
    if current_creations >= 3 then
      raise exception 'Free plan limit reached: Maximum 3 project creations per month.';
    end if;
  end if;

  -- Increment monthly creations
  update profiles
  set monthly_project_creations = monthly_project_creations + 1
  where id = auth.uid();

  return new;
end;
$$ language plpgsql;

-- Trigger for project limits
drop trigger if exists enforce_project_limits on projects;
create trigger enforce_project_limits
  before insert on projects
  for each row execute procedure check_project_limits();
