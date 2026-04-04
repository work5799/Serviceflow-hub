create table if not exists public.erp_app_state (
  section text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.erp_app_state enable row level security;

create policy "anon_select_erp_app_state"
on public.erp_app_state
for select
to anon
using (true);

create policy "anon_insert_erp_app_state"
on public.erp_app_state
for insert
to anon
with check (true);

create policy "anon_update_erp_app_state"
on public.erp_app_state
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.erp_app_state;
