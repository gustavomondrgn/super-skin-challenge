-- Super Skin Challenge: execute este arquivo inteiro no SQL Editor do Supabase.
-- Pode executar novamente: os resultados e os administradores são preservados.
-- O cadastro do seu administrador está no README.md, depois da criação do usuário.

begin;

create table if not exists public.event_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table if not exists public.tournament_state (
  id text primary key default 'main',
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint tournament_state_singleton check (id = 'main'),
  constraint tournament_state_data_object check (jsonb_typeof(data) = 'object'),
  constraint tournament_state_schema_version check (data @> '{"schemaVersion": 1}'::jsonb),
  constraint tournament_state_data_size check (octet_length(data::text) <= 1048576),
  constraint tournament_state_positive_version check (version > 0)
);

-- O relógio e a versão são conferidos no banco. A aplicação envia a próxima
-- versão e filtra pela anterior: UPDATE ... WHERE id = 'main' AND version = N.
create or replace function public.stamp_tournament_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
  else
    if new.version is distinct from old.version + 1 then
      raise exception 'A versão do evento mudou. Atualize os dados antes de salvar.'
        using errcode = '40001';
    end if;
    new.version := old.version + 1;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.stamp_tournament_state() from public, anon, authenticated;

drop trigger if exists stamp_tournament_state on public.tournament_state;
create trigger stamp_tournament_state
before insert or update on public.tournament_state
for each row execute function public.stamp_tournament_state();

alter table public.event_admins enable row level security;
alter table public.tournament_state enable row level security;

-- Grants e RLS atuam juntos. Nenhum visitante pode alterar ou apagar o evento.
revoke all on table public.event_admins from public, anon, authenticated;
revoke all on table public.tournament_state from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.event_admins to authenticated;
grant select on table public.tournament_state to anon, authenticated;
grant insert, update on table public.tournament_state to authenticated;

drop policy if exists "Admin reads own membership" on public.event_admins;
create policy "Admin reads own membership"
on public.event_admins for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Public reads tournament" on public.tournament_state;
create policy "Public reads tournament"
on public.tournament_state for select
to anon, authenticated
using (id = 'main');

drop policy if exists "Admin creates tournament" on public.tournament_state;
create policy "Admin creates tournament"
on public.tournament_state for insert
to authenticated
with check (
  id = 'main'
  and exists (
    select 1 from public.event_admins
    where user_id = (select auth.uid())
  )
);

drop policy if exists "Admin updates tournament" on public.tournament_state;
create policy "Admin updates tournament"
on public.tournament_state for update
to authenticated
using (
  id = 'main'
  and exists (
    select 1 from public.event_admins
    where user_id = (select auth.uid())
  )
)
with check (
  id = 'main'
  and exists (
    select 1 from public.event_admins
    where user_id = (select auth.uid())
  )
);

-- Apenas o estado público é transmitido. Não publicar a lista de admins.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournament_state'
  ) then
    alter publication supabase_realtime add table public.tournament_state;
  end if;
end;
$$;

commit;
