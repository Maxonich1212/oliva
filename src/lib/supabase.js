import { createClient } from '@supabase/supabase-js'

// Публикуемый ключ можно держать в клиенте: доступ к данным режет RLS (только свои строки)
const URL = 'https://bqomfwbjvsovrnbsiphe.supabase.co'
const KEY = 'sb_publishable_aMqJQgO083Qyon4pdfh9RA_tVfq89Mk'

export const sb = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'oliva-auth' },
})
