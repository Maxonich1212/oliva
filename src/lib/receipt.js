// Разбор чека: JSON из приложения ФНС «Проверка чеков» или текст электронного чека.
// Каждая позиция сопоставляется с продуктом из справочника, количество пересчитывается в г/мл/шт.
import { ING } from '../data/ingredients.js'

// Ключевые слова: каждая строка — набор основ, которые все должны встретиться в названии.
// not — слова, при которых продукт точно не этот.
const DICT = {
  chicken: { k: ['филе груд', 'грудк кур', 'грудк цб', 'грудк цыпл', 'филе цб', 'филе цыпл', 'филе кур', 'кур филе'], not: ['фарш', 'бедр', 'крыл', 'голен', 'копч', 'колбас', 'наггет'] },
  turkey: { k: ['индейк', 'индюш'], not: ['фарш', 'колбас', 'ветчин', 'сосиск', 'копч'] },
  turkey_mince: { k: ['фарш индейк', 'фарш индюш', 'индейк фарш'] },
  beef: { k: ['говядин', 'говяж'], not: ['фарш', 'колбас', 'тушен', 'сосиск', 'бульон'] },
  trout: { k: ['форел'] },
  cod: { k: ['треск'], not: ['печен'] },
  pollock: { k: ['минта'], not: ['икр'] },
  haddock: { k: ['пикш'] },
  hake: { k: ['хек'] },
  shrimp: { k: ['кревет'], not: ['чипс', 'соус'] },
  tuna: { k: ['тунец', 'тунц'] },
  tvorog: { k: ['творог'], not: ['сырок', 'запеканк', 'сыр творож', 'творожн'] },
  yogurt: { k: ['йогурт'], not: ['питьев сладк'] },
  kefir: { k: ['кефир'] },
  milk: { k: ['молоко'], not: ['кокос', 'сгущ', 'шоколад', 'коктейл', 'овсян', 'миндал', 'соев'] },
  cheese: { k: ['сыр'], not: ['сырок', 'творож', 'плавл', 'сливочн сыр', 'крем сыр', 'сырник', 'чипс', 'брынз', 'фета', 'моцар', 'адыг'] },
  cream_cheese: { k: ['сыр творож', 'творожн сыр', 'сливочн сыр', 'крем сыр', 'креметт', 'филадельф'] },
  egg: { k: ['яйц', 'яйцо'], not: ['лапш', 'перепел'] },
  oats: { k: ['овсян хлоп', 'хлопья овсян', 'геркулес', 'овсян'], not: ['печен', 'молоко', 'батон', 'гранол', 'каша моментал'] },
  rice: { k: ['рис'], not: ['суши', 'лапш', 'хлебц', 'мука', 'мук', 'уксус', 'японск'] },
  sushi_rice: { k: ['рис суши', 'рис для суши', 'рис японск', 'суши рис'] },
  quinoa: { k: ['киноа'] },
  buckwheat: { k: ['гречк', 'гречн', 'ядриц'], not: ['лапш', 'хлебц', 'мука'] },
  rice_noodles: { k: ['лапш рис', 'рисов лапш', 'лапша рис'] },
  rice_flour: { k: ['мука рис', 'рисов мук'] },
  rice_cake: { k: ['хлебц'], not: ['ржан', 'пшен', 'цельнозерн пшен'] },
  potato: { k: ['картоф', 'картош'], not: ['чипс', 'пюре быстр', 'фри'] },
  carrot: { k: ['морков'], not: ['корейск', 'сок'] },
  zucchini: { k: ['кабач', 'цуккин'], not: ['икра'] },
  cucumber: { k: ['огур'], not: ['солен', 'маринов', 'корнишон'] },
  tomato: { k: ['томат', 'помидор', 'черри'], not: ['паст', 'соус', 'кетчуп', 'собствен', 'консерв', 'сок', 'вялен', 'резан'] },
  tomato_can: { k: ['томаты собствен', 'томаты в собств', 'томаты резан', 'томаты консерв', 'томаты очищ', 'помидоры собствен'] },
  tomato_paste: { k: ['томатн паст', 'паста томат'] },
  bell_pepper: { k: ['перец сладк', 'перец болгар', 'перец красн', 'паприка свеж', 'перец рамиро'] },
  spinach: { k: ['шпинат'] },
  green_beans: { k: ['фасол стручк', 'стручков фасол', 'фасоль стручк'] },
  broccoli: { k: ['брокколи'] },
  eggplant: { k: ['баклажан'], not: ['икра'] },
  bokchoy: { k: ['пак чой', 'бок чой', 'пекинск', 'капуста китай'] },
  green_onion: { k: ['лук зелен', 'лук перо', 'зелен лук'] },
  greens: { k: ['укроп', 'петрушк', 'кинз', 'зелень'], not: ['сушен'] },
  ginger: { k: ['имбир'], not: ['маринов', 'молот', 'чай', 'напит'] },
  lemon: { k: ['лимон'], not: ['сок', 'лимонад', 'кислот', 'чай', 'вафл'] },
  kiwi: { k: ['киви'] },
  strawberry: { k: ['клубник'], not: ['джем', 'варен', 'йогурт', 'сироп', 'конфит'] },
  blueberry: { k: ['черник', 'голубик'], not: ['джем', 'варен', 'йогурт'] },
  banana: { k: ['банан'], not: ['чипс', 'сушен', 'йогурт'] },
  mandarin: { k: ['мандарин', 'клементин'] },
  walnut: { k: ['грецк'] },
  almond: { k: ['миндал'], not: ['молоко', 'напит', 'лепест'] },
  pumpkin_seed: { k: ['тыкв сем', 'семеч тыкв', 'семена тыкв'] },
  chia: { k: ['чиа'] },
  sesame: { k: ['кунжут'], not: ['масло'] },
  peanut_butter: { k: ['арахис паст', 'паста арахис', 'арахисов паст'] },
  dark_choc: { k: ['шоколад горьк', 'шоколад темн', 'шоколад 70', 'шоколад 72', 'шоколад 75', 'шоколад 85', 'горький шоколад'], not: ['молочн', 'бел'] },
  cocoa: { k: ['какао'], not: ['напит', 'шоколад'] },
  maple: { k: ['клен', 'кленов'] },
  gelatin: { k: ['желатин'] },
  coconut_milk: { k: ['кокос молок', 'молоко кокос', 'кокосов молок'] },
  soy: { k: ['соус соев', 'соев соус'] },
  nori: { k: ['нори'] },
  rice_vinegar: { k: ['уксус рис', 'рисов уксус'] },
  olive_oil: { k: ['масло олив', 'оливков масл', 'масло оливк'] },
}

// Продукты, которые на строгом этапе Low FODMAP лучше не брать
const HIGH = [
  ['лук репч', 'лук'], ['чеснок', 'чеснок'], ['яблок', 'яблоки'], ['груш', 'груши'], ['мед ', 'мёд'], ['мед натур', 'мёд'],
  ['хлеб', 'пшеничный хлеб'], ['батон', 'пшеничный хлеб'], ['макарон', 'пшеничные макароны'], ['спагет', 'пшеничные макароны'],
  ['фасол', 'бобовые'], ['нут', 'бобовые'], ['чечевиц', 'бобовые'], ['горох', 'бобовые'], ['гриб', 'грибы'], ['шампин', 'грибы'],
  ['цветн капуст', 'цветная капуста'], ['авокадо', 'авокадо (только 30 г)'], ['манго', 'манго'], ['арбуз', 'арбуз'],
  ['слива', 'сливы'], ['сливы', 'сливы'], ['персик', 'персики'], ['вишн', 'вишня'], ['черешн', 'черешня'], ['изюм', 'сухофрукты'], ['финик', 'сухофрукты'], ['кураг', 'сухофрукты'],
  ['кешью', 'кешью'], ['фисташ', 'фисташки'], ['сорбит', 'сорбит'], ['мальтит', 'мальтит'], ['цикори', 'цикорий'], ['инулин', 'инулин'],
]
const NOT_FOOD = ['пакет', 'майка', 'салфет', 'бумаг', 'туал', 'губк', 'средств', 'шампун', 'порошок стир', 'зубн', 'корм', 'наполнит', 'батарейк', 'доставк', 'сборк']

const norm = (s) =>
  ' ' +
  String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-zа-я0-9.%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() +
  ' '

// Все основы из фразы встречаются как начала слов
function hasAll(n, phrase) {
  return phrase.split(' ').every((w) => n.includes(' ' + w))
}

export function matchName(name) {
  const n = norm(name)
  if (NOT_FOOD.some((w) => n.includes(' ' + w))) return { id: null, skip: true }
  let best = null
  let bestLen = 0
  for (const [id, d] of Object.entries(DICT)) {
    if (d.not && d.not.some((w) => hasAll(n, w))) continue
    for (const k of d.k) {
      if (hasAll(n, k) && k.length > bestLen) {
        best = id
        bestLen = k.length
      }
    }
  }
  return { id: best }
}

export function warnings(name, id) {
  const n = norm(name)
  const w = []
  if (['tvorog', 'yogurt', 'kefir', 'milk', 'cream_cheese'].includes(id) && !/безлакт|б лакт|без лакт|лактоз|lactose|lf /.test(n)) w.push('похоже, не безлактозный')
  if (!id) {
    for (const [k, label] of HIGH) if (n.includes(' ' + k)) {
      w.push(`не для 1 этапа: ${label}`)
      break
    }
  }
  return w
}

// Размер упаковки из названия: «180г», «0,9 кг», «930мл», «1л», «10шт»
function sizeFromName(name) {
  const n = norm(name)
  let m = n.match(/(\d+(?:\.\d+)?)\s?(кг|г|гр|мл|л|шт)(?![а-я])/)
  if (!m) return null
  const v = parseFloat(m[1])
  const u = m[2]
  if (u === 'кг') return { g: v * 1000 }
  if (u === 'г' || u === 'гр') return { g: v }
  if (u === 'л') return { g: v * 1000 }
  if (u === 'мл') return { g: v }
  if (u === 'шт') return { pc: v }
  return null
}

// Сколько единиц справочника (г/мл/шт) получилось из позиции чека
export function qtyFor(id, name, quantity, byWeight) {
  const ing = ING[id]
  if (!ing) return 0
  const size = sizeFromName(name)
  const count = quantity || 1
  if (ing.unit === 'pc') {
    if (size?.pc) return size.pc * count
    if (byWeight) return Math.max(1, Math.round((count * 1000) / ing.pw))
    if (size?.g) return Math.max(1, Math.round((size.g * count) / ing.pw))
    return count
  }
  if (byWeight) return Math.round(count * 1000)
  if (size?.g) return Math.round(size.g * count)
  if (ing.pack) return Math.round(ing.pack * count)
  return Math.round(count * 100)
}

// ───── входные форматы ─────
function findItems(obj, depth = 0) {
  if (!obj || depth > 8) return null
  if (Array.isArray(obj)) {
    if (obj.length && obj.every((x) => x && typeof x === 'object' && 'name' in x)) return obj
    const all = []
    for (const x of obj) {
      const r = findItems(x, depth + 1)
      if (r) all.push(...r)
    }
    return all.length ? all : null
  }
  if (typeof obj === 'object') {
    if (Array.isArray(obj.items) && obj.items.length && 'name' in obj.items[0]) return obj.items
    for (const v of Object.values(obj)) {
      const r = findItems(v, depth + 1)
      if (r) return r
    }
  }
  return null
}

export function parseJson(text) {
  const data = JSON.parse(text)
  const items = findItems(data) || []
  return items.map((it) => {
    const q = Number(it.quantity ?? 1)
    // ФФД 1.2: itemsQuantityMeasure 11 = килограмм; в старых чеках вес — дробное количество
    const byWeight = it.itemsQuantityMeasure === 11 || it.measure === 11 || (q % 1 !== 0 && q < 20)
    return { name: String(it.name).trim(), quantity: q, byWeight, sum: it.sum ? it.sum / 100 : null }
  })
}

// Текст: «ФИЛЕ ГРУДКИ ЦБ 1КГ   1 x 349.99  349.99» или построчно «название / 2 * 89.90 = 179.80»
export function parseText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out = []
  const SKIP = /^(итог|итого|сумма|наличн|безнал|карт|ндс|кассир|смена|чек|инн|фн |фд |фп|сайт|адрес|место|спасибо|сдача|скидк|оплат|приход|кассов|рн ккт|зн ккт|получено|электрон|бонус|всего|\d{2}\.\d{2}\.\d{2,4})/i
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]
    if (SKIP.test(l)) continue
    if (!/[а-яё]{3,}/i.test(l)) {
      // строка только с цифрами — количество для предыдущей позиции
      const prev = out[out.length - 1]
      const m = l.match(/(\d+(?:[.,]\d+)?)\s*[x*х×]\s*\d/)
      if (prev && m && !prev.qset) {
        prev.quantity = parseFloat(m[1].replace(',', '.'))
        prev.byWeight = prev.quantity % 1 !== 0
        prev.qset = true
      }
      continue
    }
    let quantity = 1
    let qset = false
    const m = l.match(/(\d+(?:[.,]\d+)?)\s*(?:кг|шт)?\s*[x*х×]\s*\d+(?:[.,]\d+)?/i)
    if (m) {
      quantity = parseFloat(m[1].replace(',', '.'))
      qset = true
      l = l.slice(0, m.index)
    }
    l = l.replace(/^\d+[.)]\s*/, '').replace(/\s{2,}.*$/, '').replace(/[\d\s.,=*]+$/, '').trim()
    if (l.length < 3) continue
    out.push({ name: l, quantity, byWeight: quantity % 1 !== 0, qset })
  }
  return out
}

export function analyze(rows) {
  return rows.map((r, i) => {
    const { id, skip } = matchName(r.name)
    const qty = id ? qtyFor(id, r.name, r.quantity, r.byWeight) : 0
    return { key: i, ...r, id, skip: !!skip, qty, on: !!id, warn: warnings(r.name, id) }
  })
}
