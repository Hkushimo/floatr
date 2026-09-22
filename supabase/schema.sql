create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, technician_id)
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  category text not null check (category in ('Audio', 'Video/Display', 'Microphone', 'Other')),
  description text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.request_claims (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, technician_id)
);

do $$
begin
  alter publication supabase_realtime add table public.requests;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.request_claims;
exception
  when duplicate_object then null;
end $$;

alter table public.events enable row level security;
alter table public.rooms enable row level security;
alter table public.technicians enable row level security;
alter table public.room_assignments enable row level security;
alter table public.requests enable row level security;
alter table public.request_claims enable row level security;

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (true);
drop policy if exists "public write events" on public.events;
create policy "public write events" on public.events for insert with check (true);
drop policy if exists "public update events" on public.events;
create policy "public update events" on public.events for update using (true) with check (true);
drop policy if exists "public delete events" on public.events;
create policy "public delete events" on public.events for delete using (true);

drop policy if exists "public read rooms" on public.rooms;
create policy "public read rooms" on public.rooms for select using (true);
drop policy if exists "public write rooms" on public.rooms;
create policy "public write rooms" on public.rooms for insert with check (true);
drop policy if exists "public update rooms" on public.rooms;
create policy "public update rooms" on public.rooms for update using (true) with check (true);
drop policy if exists "public delete rooms" on public.rooms;
create policy "public delete rooms" on public.rooms for delete using (true);

drop policy if exists "public read technicians" on public.technicians;
create policy "public read technicians" on public.technicians for select using (true);
drop policy if exists "public write technicians" on public.technicians;
create policy "public write technicians" on public.technicians for insert with check (true);
drop policy if exists "public update technicians" on public.technicians;
create policy "public update technicians" on public.technicians for update using (true) with check (true);
drop policy if exists "public delete technicians" on public.technicians;
create policy "public delete technicians" on public.technicians for delete using (true);

drop policy if exists "public read assignments" on public.room_assignments;
create policy "public read assignments" on public.room_assignments for select using (true);
drop policy if exists "public write assignments" on public.room_assignments;
create policy "public write assignments" on public.room_assignments for insert with check (true);
drop policy if exists "public update assignments" on public.room_assignments;
create policy "public update assignments" on public.room_assignments for update using (true) with check (true);
drop policy if exists "public delete assignments" on public.room_assignments;
create policy "public delete assignments" on public.room_assignments for delete using (true);

drop policy if exists "public read requests" on public.requests;
create policy "public read requests" on public.requests for select using (true);
drop policy if exists "public create requests" on public.requests;
create policy "public create requests" on public.requests for insert with check (true);
drop policy if exists "public update requests" on public.requests;
create policy "public update requests" on public.requests for update using (true) with check (true);
drop policy if exists "public delete requests" on public.requests;
create policy "public delete requests" on public.requests for delete using (true);

drop policy if exists "public read claims" on public.request_claims;
create policy "public read claims" on public.request_claims for select using (true);
drop policy if exists "public write claims" on public.request_claims;
create policy "public write claims" on public.request_claims for insert with check (true);
drop policy if exists "public update claims" on public.request_claims;
create policy "public update claims" on public.request_claims for update using (true) with check (true);
drop policy if exists "public delete claims" on public.request_claims;
create policy "public delete claims" on public.request_claims for delete using (true);

create or replace function public.reset_show()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table
    public.request_claims,
    public.requests,
    public.room_assignments,
    public.rooms,
    public.events,
    public.technicians
  restart identity cascade;
end;
$$;

grant execute on function public.reset_show() to anon;
grant execute on function public.reset_show() to authenticated;
