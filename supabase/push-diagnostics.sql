-- Диагностика push-уведомлений
select
  (select count(*) from auth.users) as "аккаунтов",
  (select count(*) from public.push_subs) as "устройств",
  (select count(*) from public.push_queue where id like 'test-%') as "тестов",
  (select data->>'pushOn' from public.records where id = 'settings') as "push_вкл",
  (select coalesce(data->>'error', 'ok') || ' | standalone=' || coalesce(data->>'standalone', '?') || ' | perm=' || coalesce(data->>'permission', '?')
     from public.records where id = 'debug:push') as "ошибка_подписки",
  (select r.status_code::text || ' ' || coalesce(left(r.content::text, 150), '') || coalesce(r.error_msg, '') from net._http_response r order by r.created desc limit 1) as "ответ_функции";
