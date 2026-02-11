-- Create detection_logs table for storing AI analytics history
create table if not exists public.detection_logs (
    id uuid default gen_random_uuid() primary key,
    device_code text not null,
    person_id text,
    age_group text,
    gender text,
    emotion text,
    attention_duration float,
    detected_at timestamptz default now(),
    created_at timestamptz default now()
);

-- Add RLS policies
alter table public.detection_logs enable row level security;

-- Allow insert for everyone (devices need to write logs without full auth sometimes)
create policy "Enable insert for all"
on public.detection_logs for insert
with check (true);

-- Allow select for authenticated users (dashboard)
create policy "Enable select for authenticated users"
on public.detection_logs for select
using (auth.role() = 'authenticated');

-- Create index for faster queries by device and date
create index if not exists idx_detection_logs_device_date 
on public.detection_logs (device_code, detected_at);
