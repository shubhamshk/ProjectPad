-- Add credits_granted_at to profiles if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'credits_granted_at') then
    alter table profiles add column credits_granted_at timestamptz default now();
  end if;
end $$;

-- Ensure credits column exists and has default (already in previous migration, but safe to re-assert)
alter table profiles alter column credits set default 300;

-- Create index on id if not exists (primary key is already indexed, but explicit index on FKs is good practice if needed, though id is PK here)
-- Primary key index is sufficient for 'id'.

-- Add check constraint to prevent negative credits (optional but good for data integrity)
alter table profiles drop constraint if exists credits_non_negative;
alter table profiles add constraint credits_non_negative check (credits >= 0);
