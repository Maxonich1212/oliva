-- Олива: одна универсальная таблица записей с синхронизацией last-write-wins.
-- Клиент сам генерирует id и updated_at (ms), сервер ставит server_at — по нему клиент забирает изменения.
-- kind: settings | meal (отметки приёмов пищи) | swap (замены блюд) | pantry (запасы) |
--       buy (отметки в списке покупок) | feel (самочувствие) | weight | measure | custom (свои продукты)

create or replace function public.touch_server_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.server_at := clock_timestamp();
  return new;
end $$;

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  server_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists records_pull on public.records (user_id, server_at);

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.touch_server_at();

alter table public.records enable row level security;

drop policy if exists "own records" on public.records;
create policy "own records" on public.records
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- В новых проектах Supabase права на таблицы не выдаются автоматически
grant select, insert, update, delete on public.records to authenticated;
