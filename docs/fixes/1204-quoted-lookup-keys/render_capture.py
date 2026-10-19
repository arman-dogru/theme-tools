"""Render the captured theme-check output (theme-check-before.txt / -after.txt) to a PNG.

The text is drawn verbatim from the capture files; only colour is added
(red for removed lines and offenses, green for added lines). Requires Pillow
and DejaVu Sans Mono.

    python3 render_capture.py   # writes before-after.png next to this file
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 13)
BOLD = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 14)
BG, FG, DIM = (24, 26, 31), (220, 223, 228), (140, 146, 158)
RED, GREEN, YELLOW, CYAN = (240, 113, 120), (138, 214, 138), (229, 192, 123), (110, 190, 230)
LINE_H, PAD = 18, 16


def colour(line: str):
    if line.startswith("$"):
        return CYAN
    if line.startswith(("---", "+++", "diff ", "@@")):
        return DIM
    if line.startswith("-"):
        return RED
    if line.startswith("+"):
        return GREEN
    if "[LiquidHTMLSyntaxError]" in line:
        return YELLOW
    return FG


panels = [
    ("BEFORE  (main @ ee5ab68)", HERE / "theme-check-before.txt", RED),
    ("AFTER   (this branch)", HERE / "theme-check-after.txt", GREEN),
]
blocks = [(title, path.read_text().rstrip("\n").splitlines(), c) for title, path, c in panels]
width_chars = max(len(l) for _, lines, _ in blocks for l in lines)
char_w = FONT.getbbox("M")[2]
W = PAD * 2 + char_w * width_chars
H = sum(PAD * 2 + LINE_H * (len(lines) + 2) for _, lines, _ in blocks)
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
y = 0
for title, lines, c in blocks:
    y += PAD
    d.text((PAD, y), title, font=BOLD, fill=c)
    y += LINE_H * 2
    for line in lines:
        d.text((PAD, y), line, font=FONT, fill=colour(line))
        y += LINE_H
    y += PAD
    d.line([(0, y - 1), (W, y - 1)], fill=(60, 64, 72), width=1)
img.save(HERE / "before-after.png", optimize=True)
print(f"wrote {HERE / 'before-after.png'} ({W}x{H})")
