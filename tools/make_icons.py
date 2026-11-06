"""生成应用图标（印章样式）。运行：python tools/make_icons.py
字形来自系统的 Noto Serif SC（SIL OFL 许可）。只需在换图标时运行一次，结果已放在 icons/。"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'icons')
FONT = r'C:\Windows\Fonts\NotoSerifSC-VF.ttf'
RED = (168, 54, 42)
PAPER = (251, 248, 241)
os.makedirs(OUT, exist_ok=True)


def icon(size, glyph_ratio, frame=True):
    s = size * 4  # 超采样，边缘更干净
    img = Image.new('RGB', (s, s), RED)
    d = ImageDraw.Draw(img)
    if frame:
        inset = int(s * 0.1)
        d.rounded_rectangle([inset, inset, s - inset, s - inset], radius=int(s * 0.05), outline=PAPER, width=max(4, int(s * 0.016)))
    f = ImageFont.truetype(FONT, int(s * glyph_ratio))
    try:
        f.set_variation_by_axes([800])
    except Exception:
        pass
    box = d.textbbox((0, 0), '玄', font=f)
    x = (s - (box[2] - box[0])) / 2 - box[0]
    y = (s - (box[3] - box[1])) / 2 - box[1]
    d.text((x, y), '玄', font=f, fill=PAPER)
    return img.resize((size, size), Image.LANCZOS)


icon(180, 0.54).save(os.path.join(OUT, 'apple-touch-icon.png'))  # iOS 主屏幕，必须不透明
icon(192, 0.54).save(os.path.join(OUT, 'icon-192.png'))
icon(512, 0.54).save(os.path.join(OUT, 'icon-512.png'))
icon(512, 0.46, frame=False).save(os.path.join(OUT, 'icon-maskable-512.png'))  # 字形留在安全区内
print('icons written to', os.path.normpath(OUT))
