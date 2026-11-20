"""Иконки и заставки для «Оливы».

Рисует ветку оливы в высоком разрешении (1024 px) и раскладывает:
  public/icon-180.png  — iPhone «На экран Домой» (без прозрачности, углы скругляет сама iOS)
  public/icon-192.png, icon-512.png — Android/manifest
  public/icon-maskable-512.png — Android с запасом под круглую/каплевидную маску
  public/splash/*.png — заставки запуска для iPhone
Запуск: python3 scripts/make-icons.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
BG_IN = (247, 241, 230)
BG_OUT = (232, 222, 203)
OLIVE = (98, 113, 64)
OLIVE_D = (74, 87, 47)
SAGE = (160, 178, 138)
SAGE_L = (190, 204, 168)
TERRA = (196, 124, 88)
TERRA_L = (222, 160, 124)


def bg(size):
    """Тёплый «овсяный» фон с мягким радиальным светом."""
    im = Image.new('RGB', (size, size), BG_OUT)
    px = im.load()
    c = size / 2
    for y in range(size):
        for x in range(size):
            d = min(1, math.hypot(x - c * 0.9, y - c * 0.8) / (size * 0.78))
            t = d ** 1.6
            px[x, y] = tuple(int(BG_IN[i] * (1 - t) + BG_OUT[i] * t) for i in range(3))
    return im


def bezier(p0, p1, p2, p3, n=80):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t ** 3 * p3[0]
        y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1]
        pts.append((x, y))
    return pts


def leaf(d, cx, cy, length, width, angle, col, vein):
    """Лист оливы: заострённый с двух концов, с центральной жилкой."""
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for i in range(61):
        t = i / 60 * math.pi * 2
        x = length / 2 * math.cos(t)
        y = width / 2 * math.sin(t) * (abs(math.sin(t)) ** 0.15)
        y *= 1 - 0.35 * (x / (length / 2)) ** 2 * 0  # форма веретена
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    d.polygon(pts, fill=col)
    d.line([(cx - length * 0.42 * ca, cy - length * 0.42 * sa), (cx + length * 0.42 * ca, cy + length * 0.42 * sa)], fill=vein, width=max(2, int(width * 0.08)))


def olive(im, cx, cy, rx, ry, col, light):
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=col)
    d.ellipse([cx - rx * 0.55, cy - ry * 0.7, cx - rx * 0.05, cy - ry * 0.2], fill=light + (150,))
    im.alpha_composite(lay)


def art(size=1024, scale=1.0):
    """Ветка на прозрачном слое. scale < 1 — с запасом по краям (для maskable)."""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    S = size / 64 * scale
    off = size * (1 - scale) / 2
    P = lambda x, y: (off + x * S, off + y * S)

    # мягкая тень под веткой
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.line([P(*p) for p in bezier((15, 52), (25, 40), (35, 27), (49, 12))], fill=(60, 50, 30, 55), width=int(3 * S))
    sh = sh.filter(ImageFilter.GaussianBlur(size / 60))
    im.alpha_composite(sh, (int(size * 0.008), int(size * 0.02)))

    d = ImageDraw.Draw(im)
    B = ((15, 52), (25, 40), (35, 27), (49, 12))
    pts = bezier(*B, n=160)
    sw = 1.7 * S
    for i, (x, y) in enumerate(pts):
        r = sw / 2 * (1 - 0.45 * i / len(pts))  # стебель сужается к верхушке
        X, Y = P(x, y)
        d.ellipse([X - r, Y - r, X + r, Y + r], fill=OLIVE_D + (255,))

    def at(t):
        i = min(len(pts) - 2, int(t * (len(pts) - 1)))
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        return (x0, y0), math.degrees(math.atan2(y1 - y0, x1 - x0))

    # листья растут из стебля попеременно, к верхушке мельче
    for t, side, L, W, col in [
        (0.30, 1, 14.5, 4.6, SAGE), (0.40, -1, 14, 4.4, OLIVE),
        (0.54, 1, 13, 4.2, OLIVE), (0.64, -1, 12.5, 4.0, SAGE_L),
        (0.78, 1, 11, 3.6, SAGE), (0.86, -1, 10, 3.3, OLIVE),
    ]:
        (x, y), ang = at(t)
        a = ang + side * 42
        ra = math.radians(a)
        cx, cy = x + math.cos(ra) * L * 0.5, y + math.sin(ra) * L * 0.5
        X, Y = P(cx, cy)
        vein = tuple(max(0, v - 30) for v in col)
        leaf(d, X, Y, L * S, W * S, a, col + (255,), vein + (255,))
    # верхушка
    (x, y), ang = at(0.995)
    ra = math.radians(ang)
    X, Y = P(x + math.cos(ra) * 4, y + math.sin(ra) * 4)
    leaf(d, X, Y, 9 * S, 3 * S, ang, SAGE + (255,), tuple(v - 30 for v in SAGE) + (255,))

    # две оливки на коротких плодоножках
    for t, dx, dy, rx, ry, col, light in [(0.16, -5.5, 5.5, 4.4, 5.4, TERRA, TERRA_L), (0.22, 4.5, 6.5, 3.6, 4.5, OLIVE_D, SAGE)]:
        (x, y), _ = at(t)
        ox, oy = x + dx, y + dy
        d.line([P(x, y), P(ox, oy - ry * 0.8)], fill=OLIVE_D + (255,), width=max(1, int(0.8 * S)))
        X, Y = P(ox, oy)
        olive(im, X, Y, rx * S, ry * S, col + (255,), light)
        d = ImageDraw.Draw(im)
    return im


def icon(size, scale=0.8):
    base = bg(1024).convert('RGBA')
    lay = art(1024, scale)
    # центрируем рисунок по его видимым границам
    x0, y0, x1, y1 = lay.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    dx, dy = int(512 - (x0 + x1) / 2), int(512 - (y0 + y1) / 2)
    moved = Image.new('RGBA', lay.size, (0, 0, 0, 0))
    moved.alpha_composite(lay, (max(0, dx), max(0, dy)), (max(0, -dx), max(0, -dy)))
    base.alpha_composite(moved)
    return base.convert('RGB').resize((size, size), Image.LANCZOS)


def splash(w, h, name):
    im = Image.new('RGB', (w, h), (243, 237, 227))
    s = int(min(w, h) * 0.34)
    ic = icon(1024).resize((s, s), Image.LANCZOS)
    # скругление как у иконки
    mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.225), fill=255)
    x, y = (w - s) // 2, int(h * 0.40 - s / 2)
    im.paste(ic, (x, y), mask)
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', int(s * 0.28))
    t = 'Олива'
    tw = d.textlength(t, font=font)
    d.text(((w - tw) / 2, y + s + s * 0.16), t, font=font, fill=(47, 44, 37))
    small = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', int(s * 0.1))
    t2 = 'меню на месяц'
    d.text(((w - d.textlength(t2, font=small)) / 2, y + s + s * 0.55), t2, font=small, fill=(143, 135, 120))
    im.save(os.path.join(ROOT, 'splash', name), optimize=True)


# Размеры экранов iPhone (px) и их CSS-размеры для media-запросов
SPLASH = [
    (1320, 2868, 440, 956, 3), (1206, 2622, 402, 874, 3), (1290, 2796, 430, 932, 3), (1179, 2556, 393, 852, 3),
    (1284, 2778, 428, 926, 3), (1170, 2532, 390, 844, 3), (1125, 2436, 375, 812, 3), (1242, 2688, 414, 896, 3),
    (828, 1792, 414, 896, 2), (1080, 2340, 360, 780, 3), (750, 1334, 375, 667, 2), (1242, 2208, 414, 736, 3),
]

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'splash'), exist_ok=True)
    big = icon(1024)
    big.save(os.path.join(ROOT, 'icon-1024.png'))
    for s in (180, 192, 512):
        big.resize((s, s), Image.LANCZOS).save(os.path.join(ROOT, f'icon-{s}.png'), optimize=True)
    icon(512, 0.62).save(os.path.join(ROOT, 'icon-maskable-512.png'), optimize=True)
    links = []
    for w, h, cw, ch, r in SPLASH:
        name = f'{w}x{h}.png'
        splash(w, h, name)
        links.append(f'<link rel="apple-touch-startup-image" media="(device-width: {cw}px) and (device-height: {ch}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait)" href="./splash/{name}" />')
    open(os.path.join(ROOT, 'splash', 'links.html'), 'w').write('\n'.join(links) + '\n')
    print('ok')
