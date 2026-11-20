// Список покупок для отправки: текст, картинка (PNG) и PDF.
// Картинка рисуется на canvas теми же шрифтами, что и приложение; PDF собирается вручную из JPEG-страниц A4 —
// так кириллица выглядит ровно как на экране, без встраивания шрифтов.

// doc = { title, subtitle, sections: [{ name, emoji, items: [{ name, qty, note }] }] }

export function toText(doc) {
  const lines = [doc.title, doc.subtitle, '']
  for (const s of doc.sections) {
    lines.push(`${s.emoji ? s.emoji + ' ' : ''}${s.name}`)
    for (const it of s.items) lines.push(`☐ ${it.name}${it.qty ? ` — ${it.qty}` : ''}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

const C = { bg: '#f3ede3', card: '#fbf8f2', ink: '#2f2c25', ink2: '#5b564b', muted: '#8f8778', line: '#e5dccd', olive: '#6e7d4e' }
const W = 1080
const PAD = 64

async function fonts() {
  try {
    await Promise.all([
      document.fonts.load('600 54px Lora'),
      document.fonts.load('800 30px "Manrope Variable"'),
      document.fonts.load('600 32px "Manrope Variable"'),
    ])
  } catch {
    /* шрифты по умолчанию */
  }
}

function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

export async function toCanvas(doc) {
  await fonts()
  const ROW = 64
  const HEAD = 78
  let h = PAD + 70 + 50 + 30
  for (const s of doc.sections) h += HEAD + s.items.length * ROW + 34
  h += 70
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = h
  const ctx = cv.getContext('2d')
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, h)

  let y = PAD + 50
  ctx.fillStyle = C.ink
  ctx.font = '600 54px Lora, Georgia, serif'
  ctx.fillText(doc.title, PAD, y)
  y += 50
  ctx.fillStyle = C.muted
  ctx.font = '600 28px "Manrope Variable", system-ui, sans-serif'
  ctx.fillText(doc.subtitle, PAD, y)
  y += 40

  for (const s of doc.sections) {
    const boxH = HEAD + s.items.length * ROW
    // карточка раздела
    ctx.fillStyle = C.card
    roundRect(ctx, PAD - 20, y, W - 2 * (PAD - 20), boxH, 28)
    ctx.fill()
    ctx.fillStyle = C.muted
    ctx.font = '800 24px "Manrope Variable", system-ui, sans-serif'
    ctx.fillText(`${s.emoji ? s.emoji + '  ' : ''}${s.name.toUpperCase()}`, PAD + 8, y + 50)
    let ry = y + HEAD
    s.items.forEach((it, i) => {
      if (i > 0) {
        ctx.fillStyle = C.line
        ctx.fillRect(PAD + 8, ry, W - 2 * PAD - 16, 2)
      }
      // чекбокс
      ctx.strokeStyle = '#cbbfa9'
      ctx.lineWidth = 3
      roundRect(ctx, PAD + 8, ry + 17, 30, 30, 9)
      ctx.stroke()
      // количество справа
      ctx.font = '800 30px "Manrope Variable", system-ui, sans-serif'
      ctx.fillStyle = C.olive
      const qw = it.qty ? ctx.measureText(it.qty).width : 0
      if (it.qty) ctx.fillText(it.qty, W - PAD - 8 - qw, ry + 43)
      // название
      ctx.font = '600 31px "Manrope Variable", system-ui, sans-serif'
      ctx.fillStyle = C.ink
      ctx.fillText(fit(ctx, it.name, W - 2 * PAD - 80 - qw - 24), PAD + 60, ry + 43)
      ry += ROW
    })
    y += boxH + 34
  }
  ctx.fillStyle = C.muted
  ctx.font = '600 24px "Manrope Variable", system-ui, sans-serif'
  const foot = '🌿 Олива — меню на месяц'
  ctx.fillText(foot, (W - ctx.measureText(foot).width) / 2, h - 36)
  return cv
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const blobOf = (cv, type, q) => new Promise((res) => cv.toBlob(res, type, q))

export async function toPng(doc) {
  return blobOf(await toCanvas(doc), 'image/png')
}

// PDF: длинная картинка режется на страницы A4, каждая — JPEG
export async function toPdf(doc) {
  const cv = await toCanvas(doc)
  const pageH = Math.round((W * 297) / 210)
  const pages = []
  for (let top = 0; top < cv.height; top += pageH) {
    const pc = document.createElement('canvas')
    pc.width = W
    pc.height = pageH
    const ctx = pc.getContext('2d')
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, pageH)
    ctx.drawImage(cv, 0, top, W, Math.min(pageH, cv.height - top), 0, 0, W, Math.min(pageH, cv.height - top))
    const jpg = new Uint8Array(await (await blobOf(pc, 'image/jpeg', 0.9)).arrayBuffer())
    pages.push(jpg)
  }
  return buildPdf(pages, W, pageH)
}

function buildPdf(jpegs, w, h) {
  const enc = new TextEncoder()
  const parts = []
  const offsets = []
  let len = 0
  const push = (x) => {
    const b = typeof x === 'string' ? enc.encode(x) : x
    parts.push(b)
    len += b.length
  }
  const obj = (n, body) => {
    offsets[n] = len
    push(`${n} 0 obj\n`)
    for (const b of [].concat(body)) push(b)
    push('\nendobj\n')
  }
  const PW = 595.28
  const PH = 841.89
  const n = jpegs.length
  // 1 — каталог, 2 — список страниц, далее по 3 объекта на страницу: страница, картинка, содержимое
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`)
  jpegs.forEach((jpg, i) => {
    const p = 3 + i * 3
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`)
    obj(p + 1, [`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream'])
    const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`
    obj(p + 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })
  const xref = len
  const total = 3 + n * 3
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  push(x)
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts, { type: 'application/pdf' })
}

// Отправить файл через системное меню «Поделиться», а если нельзя — скачать
export async function shareFile(blob, name, title) {
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'download'
}
