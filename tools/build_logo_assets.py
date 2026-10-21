"""
Build SNS Official logo assets from public/images/logo-original.jpeg.

Outputs (original is never modified):
  public/images/logo-full.png   - full logo, black keyed to true alpha, trimmed
  public/images/logo-mark.png   - "SNS" monogram + swash only, trimmed
  public/favicon.ico (16/32/48/64), favicon-16x16.png, favicon-32x32.png,
  public/apple-touch-icon.png, android-chrome-192x192.png, android-chrome-512x512.png

Run from the project root:  python tools/build_logo_assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC = PUBLIC / "images" / "logo-original.jpeg"

NOISE_FLOOR = 12      # max-channel values <= this are treated as pure black (JPEG noise)
MIN_FG_BRIGHT = 170   # assumed minimum brightness of the gold foreground for isolated glow
OPAQUE_RATIO = 0.92   # pixel this close to local foreground brightness -> fully opaque
BG = (10, 10, 10)     # #0A0A0A


# --------------------------------------------------------------------------- #
# 1. Black -> alpha keying
# --------------------------------------------------------------------------- #
def key_black(rgb: np.ndarray) -> np.ndarray:
    """Return straight (un-premultiplied) RGBA float array in 0..1.

    The artwork is gold composited over black, so observed = alpha * F.
    F's brightness is estimated from the brightest nearby pixel (the solid
    gold the edge belongs to); alpha = observed / F. Colour is then
    un-premultiplied, which removes any dark halo on light backgrounds.
    """
    rgb = rgb.astype(np.float64)
    v = rgb.max(axis=2)

    # Remove JPEG noise floor (hue-preserving rescale).
    v2 = np.clip((v - NOISE_FLOOR) * 255.0 / (255.0 - NOISE_FLOOR), 0, 255)
    scale = np.divide(v2, v, out=np.zeros_like(v), where=v > 0)
    obs = rgb * scale[..., None]

    # Local foreground brightness.
    local_max = ndimage.maximum_filter(v2, size=7)
    fg = np.maximum(local_max, MIN_FG_BRIGHT) * OPAQUE_RATIO
    alpha = np.clip(v2 / fg, 0, 1)

    color = np.divide(obs, alpha[..., None], out=np.zeros_like(obs),
                      where=alpha[..., None] > 0)
    color = np.clip(color, 0, 255)

    alpha[alpha < 3 / 255] = 0
    return np.dstack([color / 255.0, alpha])


def remove_specks(rgba: np.ndarray, min_area=24, weak_alpha=0.35) -> np.ndarray:
    """Drop tiny, faint isolated blobs (leftover compression noise)."""
    a = rgba[..., 3]
    lab, n = ndimage.label(a > 0)
    if n:
        idx = np.arange(1, n + 1)
        area = ndimage.sum(np.ones_like(a), lab, idx)
        peak = ndimage.maximum(a, lab, idx)
        kill = idx[(area < min_area) & (peak < weak_alpha)]
        rgba[np.isin(lab, kill), 3] = 0
    return rgba


def to_image(rgba: np.ndarray) -> Image.Image:
    out = rgba.copy()
    out[out[..., 3] == 0, :3] = 0
    return Image.fromarray(np.round(out * 255).astype(np.uint8), "RGBA")


def trim(img: Image.Image, thresh=2, pad=2) -> Image.Image:
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > thresh)
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
           min(xs.max() + 1 + pad, img.width), min(ys.max() + 1 + pad, img.height))
    return img.crop(box)


# --------------------------------------------------------------------------- #
# 2. Monogram mask (coordinates in original 1254x1254 pixel space)
# --------------------------------------------------------------------------- #
SS = 4  # supersampling for anti-aliased mask edges


def erase_mask(size) -> np.ndarray:
    """1.0 where pixels are KEPT, 0.0 where dress / hand / text is removed."""
    w, h = size
    m = Image.new("L", (w * SS, h * SS), 255)
    d = ImageDraw.Draw(m)

    def poly(pts):
        d.polygon([(x * SS, y * SS) for x, y in pts], fill=0)

    def rect(x0, y0, x1, y1):
        d.rectangle([x0 * SS, y0 * SS, x1 * SS - 1, y1 * SS - 1], fill=0)

    # Everything above the cap line (woman, hair, upper dress, hand).
    rect(0, 0, w, 440)
    # Pleat tips sitting just above the letter tops.
    # Above left-S terminal: follows the measured S top edge 2px above it.
    poly([(375, 440), (375, 454), (390, 455), (400, 457), (410, 459),
          (420, 461), (430, 463), (440, 467), (450, 471), (453, 472), (453, 440)])
    rect(453, 440, 715, 460)    # above N left serif (top edge y463)
    rect(715, 440, 824, 467)    # above N right Y-serif bar (top edge AA row y467)
    # Where the pleat crosses the bar, its AA top row is solid; soften to match.
    d.rectangle([733 * SS, 467 * SS, 766 * SS - 1, 468 * SS - 1], fill=115)

    # Pleats inside the N counter: between diagonal, right stem and swash.
    swash_top = lambda x: 644 - (x - 690) * 0.4   # upper edge of swash
    poly([
        (556, 440),
        (556, 464),                      # top-right corner of N diagonal (+3px)
        (698, 632),                      # along diagonal right edge
        (700, swash_top(700) - 4),
        (748, swash_top(748) - 4),
        (748, 512),                      # left edge of right stem (-3px)
        (746, 502), (741, 492), (733, 482), (723, 471),  # Y-serif left arm
        (715, 465), (715, 440),
    ])

    # "OFFICIAL", rules, "Stitch n Style" plaque.
    rect(0, 852, w, h)

    m = m.resize((w, h), Image.LANCZOS)
    return np.asarray(m, dtype=np.float64) / 255.0


# --------------------------------------------------------------------------- #
# 3. Favicons
# --------------------------------------------------------------------------- #
def make_square_icon(mark: Image.Image, size: int, pad_frac=None) -> Image.Image:
    if pad_frac is None:
        pad_frac = 0.06 if size <= 48 else 0.10
    # Build the padded square at full resolution on the solid background, then
    # downscale the opaque RGB image (no alpha involved -> no fringes).
    side = round(max(mark.width, mark.height) / (1 - 2 * pad_frac))
    big = Image.new("RGBA", (side, side), BG + (255,))
    big.alpha_composite(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
    small = big.convert("RGB").resize((size, size), Image.LANCZOS)
    if 24 <= size <= 64:
        small = small.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=0))
    return small


def main():
    src = Image.open(SRC).convert("RGB")
    rgb = np.asarray(src)

    keyed = remove_specks(key_black(rgb))

    # Full logo
    full = trim(to_image(keyed))
    full.save(PUBLIC / "images" / "logo-full.png", optimize=True)

    # Monogram
    mark_rgba = keyed.copy()
    mark_rgba[..., 3] *= erase_mask(src.size)
    mark_rgba[mark_rgba[..., 3] < 3 / 255, 3] = 0
    mark_rgba = remove_specks(mark_rgba, min_area=60, weak_alpha=0.6)
    mark = trim(to_image(mark_rgba))
    mark.save(PUBLIC / "images" / "logo-mark.png", optimize=True)

    # Favicons
    icons = {s: make_square_icon(mark, s) for s in (16, 32, 48, 64, 180, 192, 512)}
    icons[16].save(PUBLIC / "favicon-16x16.png", optimize=True)
    icons[32].save(PUBLIC / "favicon-32x32.png", optimize=True)
    icons[180].save(PUBLIC / "apple-touch-icon.png", optimize=True)
    icons[192].save(PUBLIC / "android-chrome-192x192.png", optimize=True)
    icons[512].save(PUBLIC / "android-chrome-512x512.png", optimize=True)
    icons[64].save(PUBLIC / "favicon.ico", format="ICO",
                   sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
                   append_images=[icons[16], icons[32], icons[48]])

    print("logo-full", full.size, "logo-mark", mark.size)


if __name__ == "__main__":
    main()
