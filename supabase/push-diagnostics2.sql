-- Диагностика 2: что стало с тестом, вызывался ли pg_net и что пишет cron
select
  (select string_agg(id || ' sent=' || coalesce(to_char(sent_at at time zone 'Europe/Moscow', 'HH24:MI:SS'), 'нет'), '; ') from public.push_queue where id like 'test%') as "тесты",
  (select count(*) from net.http_request_queue) as "в_очереди_pg_net",
  (select count(*) from net._http_response) as "ответов_pg_net",
  (select string_agg(to_char(d.start_time at time zone 'Europe/Moscow', 'HH24:MI') || ' ' || d.status || ' ' || coalesce(left(d.return_message, 80), ''), ' / ' order by d.start_time desc)
     from (select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'oliva-push') order by start_time desc limit 3) d) as "cron_последние",
  (select to_char(now() at time zone 'Europe/Moscow', 'HH24:MI:SS')) as "сейчас_мск";
