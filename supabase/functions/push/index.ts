// Edge-функция `push`: получает от pg_cron пачку созревших напоминаний вместе с подписками и рассылает их.
// Доступ к базе ей не нужен. Защита — заголовок x-cron-key. В настройках функции Verify JWT выключен.
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = 'BHXyfMkEBxVF0RrLs_MoMYMpfiqG85nNk8cVNlj9isp-kMdmPJeif9IikA4WpJt9389lP1UoXoanle4bSY-KFSA'

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-key') !== Deno.env.get('CRON_KEY')) return new Response('forbidden', { status: 403 })
  webpush.setVapidDetails('https://maxonich1212.github.io/oliva/', VAPID_PUBLIC, Deno.env.get('VAPID_PRIVATE')!)
  const { items = [] } = await req.json().catch(() => ({}))
  let sent = 0
  const gone: string[] = []
  for (const it of items) {
    const payload = JSON.stringify({ title: it.title, body: it.body, url: it.url, tag: it.tag })
    for (const sub of it.subs || []) {
      try {
        await webpush.sendNotification(sub, payload, { TTL: 3600, urgency: 'high' })
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) gone.push(sub.endpoint)
      }
    }
  }
  return Response.json({ sent, gone })
})
