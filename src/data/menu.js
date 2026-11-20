// План на 28 дней: 4 недели × 7 дней, в каждом дне — завтрак, полдник, ужин.
// Обед = ужин предыдущего дня (готовим ужин на 2 порции). Исключения:
//   • первый день (вчера ужина по плану не было);
//   • воскресенье — после субботних суши/поке остатков нет, обед отдельный.
// Индекс недели: 0 = понедельник … 6 = воскресенье.

const W = (b, s, d, sunLunch) => ({ b, s, d, sunLunch })

export const WEEKS = [
  W(
    ['oat_berry', 'omelet', 'tvorog_berry', 'chia_kiwi', 'eggs_toast', 'waffles', 'syrniki'],
    ['yogurt_nuts', 'kiwi_almond', 'choc_mousse', 'cheese_carrot', 'baked_banana', 'panna_cotta', 'choc_mandarin'],
    ['trout_potato', 'chicken_stirfry', 'turkey_meatballs', 'cod_quinoa', 'beef_stew', 'poke', 'chicken_soup'],
    'quinoa_tuna',
  ),
  W(
    ['buckwheat_egg', 'oat_berry', 'frittata', 'tvorog_berry', 'chia_kiwi', 'syrniki', 'waffles'],
    ['smoothie', 'choc_mousse', 'cheese_carrot', 'oat_cookies', 'kiwi_almond', 'baked_banana', 'ricecake_pb'],
    ['pollock_crust', 'chicken_curry', 'hake_tomato', 'turkey_cutlet', 'beef_noodles', 'rolls', 'trout_potato'],
    'shakshuka',
  ),
  W(
    ['omelet', 'chia_kiwi', 'oat_berry', 'eggs_toast', 'tvorog_berry', 'waffles', 'frittata'],
    ['yogurt_nuts', 'egg_snack', 'choc_mousse', 'kiwi_almond', 'panna_cotta', 'choc_mandarin', 'baked_banana'],
    ['fish_cakes', 'chicken_veg_quinoa', 'haddock_cheese', 'shrimp_noodles', 'beef_stew', 'poke', 'turkey_meatballs'],
    'quinoa_tuna',
  ),
  W(
    ['oat_berry', 'frittata', 'buckwheat_egg', 'omelet', 'chia_kiwi', 'syrniki', 'waffles'],
    ['cheese_carrot', 'choc_mousse', 'smoothie', 'oat_cookies', 'yogurt_nuts', 'panna_cotta', 'choc_mandarin'],
    ['cod_quinoa', 'chicken_stirfry', 'pollock_crust', 'chicken_curry', 'hake_tomato', 'rolls', 'trout_potato'],
    'shakshuka',
  ),
]

export const PLAN_DAYS = 28

// План по номеру дня (0..27): { b, l, s, d, lFrom } — lFrom: 'prev' если обед — остаток вчерашнего ужина
export function planForDay(n) {
  const w = WEEKS[Math.floor(n / 7) % WEEKS.length]
  const wd = n % 7
  const prevDinner = n > 0 ? WEEKS[Math.floor((n - 1) / 7) % WEEKS.length].d[(n - 1) % 7] : null
  let l, lFrom = null
  if (n === 0) l = 'quinoa_tuna'
  else if (wd === 6) l = w.sunLunch
  else {
    l = prevDinner
    lFrom = 'prev'
  }
  return { b: w.b[wd], l, s: w.s[wd], d: w.d[wd], lFrom }
}
