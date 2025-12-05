-- Create otp_codes table
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  salt text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  used boolean default false,
  attempts int default 0
);

-- Add indexes
create index if not exists otp_codes_email_idx on public.otp_codes(email);
create index if not exists otp_codes_created_at_idx on public.otp_codes(created_at);

-- Enable RLS
alter table public.otp_codes enable row level security;

-- Create policy for service role (Edge Functions) to have full access
create policy "Service role has full access to otp_codes"
  on public.otp_codes
  for all
  to service_role
  using (true)
  with check (true);

-- No public access policies needed as all interaction is via Edge Functions
