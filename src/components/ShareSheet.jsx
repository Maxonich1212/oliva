import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Copy, Image as ImageIcon, FileText } from 'lucide-react'
import { Sheet } from './ui'
import { toText, toPng, toPdf, shareFile } from '../lib/share'
import { toast } from '../lib/store'

// «Поделиться списком»: текстом в мессенджер, скопировать, картинкой или PDF
export function ShareSheet({ open, onClose, doc }) {
  const [busy, setBusy] = useState(null)
  const run = async (kind, fn) => {
    setBusy(kind)
    try {
      await fn()
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Не получилось: ' + (e.message || e))
    } finally {
      setBusy(null)
    }
  }
  const text = doc ? toText(doc) : ''
  const opts = [
    ['text', MessageCircle, 'Отправить текстом', 'в Telegram, WhatsApp, заметки', async () => {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Список скопирован')
      }
      onClose()
    }],
    ['copy', Copy, 'Скопировать текст', 'чтобы вставить куда угодно', async () => {
      await navigator.clipboard.writeText(text)
      toast('Список скопирован')
      onClose()
    }],
    ['png', ImageIcon, 'Картинкой', 'аккуратная карточка со списком', async () => {
      const r = await shareFile(await toPng(doc), 'pokupki.png', doc.title)
      if (r === 'download') toast('Картинка сохранена')
      onClose()
    }],
    ['pdf', FileText, 'PDF', 'для печати или отправки файлом', async () => {
      const r = await shareFile(await toPdf(doc), 'pokupki.pdf', doc.title)
      if (r === 'download') toast('PDF сохранён')
      onClose()
    }],
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Поделиться списком">
      {doc && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="small muted">{doc.subtitle} · {doc.sections.reduce((a, s) => a + s.items.length, 0)} позиций</div>
          {opts.map(([k, Icon, title, hint, fn]) => (
            <motion.button key={k} whileTap={{ scale: 0.98 }} className="card row" style={{ gap: 14, textAlign: 'left', opacity: busy && busy !== k ? 0.5 : 1 }} disabled={!!busy} onClick={() => run(k, fn)}>
              <span style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--olive-soft)', color: 'var(--olive)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                {busy === k ? <span className="spin" style={{ width: 18, height: 18, border: '2.5px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%' }} /> : <Icon size={20} />}
              </span>
              <div className="grow">
                <div className="h3">{title}</div>
                <div className="tiny muted">{hint}</div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
