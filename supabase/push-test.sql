-- Поставить тестовое уведомление в очередь прямо из базы (придёт в течение минуты)
insert into public.push_queue (user_id, id, at, title, body, url, tag)
select id, 'test-sql-' || extract(epoch from now())::bigint, now(), '🌿 Олива', 'Тест с сервера: уведомления работают!', './', 'test'
from auth.users order by created_at limit 1
returning id, at;
