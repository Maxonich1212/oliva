-- Push-напоминания: подписки устройств, очередь и отправка каждую минуту.
-- Перед запуском замени __CRON_KEY__ на ключ из .secrets/push.json (готовая версия — .secrets/push-setup.sql).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own subs" on public.push_subs;
create policy "own subs" on public.push_subs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subs to authenticated;

create table if not exists public.push_queue (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  at timestamptz not null,
  title text not null,
  body text not null default '',
  url text not null default './',
  tag text,
  sent_at timestamptz,
  primary key (user_id, id)
);
create index if not exists push_queue_due on public.push_queue (at) where sent_at is null;
alter table public.push_queue enable row level security;
drop policy if exists "own queue" on public.push_queue;
create policy "own queue" on public.push_queue for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_queue to authenticated;

-- Раз в минуту: забрать созревшие напоминания (не старше 30 минут), пометить отправленными и передать в edge-функцию
create or replace function public.oliva_push_tick() returns void
language plpgsql security definer set search_path = '' as $$
declare
  batch jsonb;
begin
  with due as (
    update public.push_queue q set sent_at = now()
    where q.sent_at is null and q.at <= now() and q.at > now() - interval '30 minutes'
    returning q.user_id, q.title, q.body, q.url, q.tag
  )
  select jsonb_agg(jsonb_build_object(
    'title', d.title, 'body', d.body, 'url', d.url, 'tag', d.tag,
    'subs', (select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth))), '[]'::jsonb)
             from public.push_subs s where s.user_id = d.user_id)
  )) into batch from due d;

  if batch is not null then
    perform net.http_post(
      url := 'https://bqomfwbjvsovrnbsiphe.supabase.co/functions/v1/push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', '__CRON_KEY__'),
      body := jsonb_build_object('items', batch)
    );
  end if;

  -- старые записи не копим
  delete from public.push_queue where sent_at < now() - interval '2 days' or (sent_at is null and at < now() - interval '1 day');
end $$;
revoke all on function public.oliva_push_tick() from public, anon, authenticated;

select cron.unschedule('oliva-push') where exists (select 1 from cron.job where jobname = 'oliva-push');
select cron.schedule('oliva-push', '* * * * *', 'select public.oliva_push_tick()');
