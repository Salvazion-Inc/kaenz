"""Composite the Kaenz cyan mark onto brand-colored fields for app icons."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
SRC = BRAND / "logo.png"

NAVY = (5, 10, 48, 255)
NAVY2 = (10, 20, 80, 255)
CYAN = (0, 161, 214)


def knock_out_black(im: Image.Image) -> Image.Image:
    """Turn the black field into alpha using cyan channel energy."""
    rgba = np.array(im.convert("RGBA"))
    g = rgba[:, :, 1].astype(np.float32)
    b = rgba[:, :, 2].astype(np.float32)
    energy = np.maximum(g, b)
    rgba[:, :, 3] = np.clip(energy, 0, 255).astype(np.uint8)
    # Keep original cyan; fully transparent pixels go to zero RGB.
    mask = rgba[:, :, 3] == 0
    rgba[mask] = (0, 0, 0, 0)
    return Image.fromarray(rgba, "RGBA")


def fit_mark(mark: Image.Image, inner: int) -> Image.Image:
    return mark.resize((inner, inner), Image.Resampling.LANCZOS)


def square_on_color(mark: Image.Image, size: int, color: tuple[int, int, int, int], pad: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), color)
    inner = max(1, int(round(size * (1 - 2 * pad))))
    logo = fit_mark(mark, inner)
    xy = (size - inner) // 2
    canvas.alpha_composite(logo, (xy, xy))
    return canvas


def add_radial_glow(canvas: Image.Image, center: tuple[int, int], radius: int, alpha: int = 70) -> None:
    w, h = canvas.size
    blob = Image.new("RGBA", (radius * 2, radius * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(blob)
    draw.ellipse((0, 0, radius * 2 - 1, radius * 2 - 1), fill=(*CYAN, alpha))
    blob = blob.filter(ImageFilter.GaussianBlur(radius // 3))
    x = center[0] - radius
    y = center[1] - radius
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.paste(blob, (x, y), blob)
    canvas.alpha_composite(layer)


def save_rgb(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "PNG", optimize=True)


def main() -> None:
    mark = knock_out_black(Image.open(SRC))
    mark.save(BRAND / "logo-mark.png", "PNG", optimize=True)

    # In-app isologo: brighter navy so the tile reads as color on the navy chrome.
    app = square_on_color(mark, 512, NAVY2, pad=0.08)
    save_rgb(app, BRAND / "logo-app.png")

    # Home-screen / PWA: brand navy, extra pad for maskable safe zone.
    save_rgb(square_on_color(mark, 192, NAVY, pad=0.14), PUBLIC / "icon.png")
    save_rgb(square_on_color(mark, 512, NAVY, pad=0.14), PUBLIC / "icon-512.png")
    save_rgb(square_on_color(mark, 180, NAVY, pad=0.12), PUBLIC / "apple-touch-icon.png")
    save_rgb(square_on_color(mark, 32, NAVY, pad=0.10), PUBLIC / "favicon.png")

    # Square splash still (video frame 1 + poster).
    splash = Image.new("RGBA", (1080, 1080), NAVY)
    add_radial_glow(splash, (540, 540), 420, alpha=80)
    logo = fit_mark(mark, 760)
    splash.alpha_composite(logo, ((1080 - 760) // 2, (1080 - 760) // 2))
    save_rgb(splash, BRAND / "logo-splash.png")

    # Tall mobile splash still for the loading overlay poster.
    tall = Image.new("RGBA", (1080, 1920), NAVY)
    add_radial_glow(tall, (540, 900), 460, alpha=85)
    logo_t = fit_mark(mark, 720)
    tall.alpha_composite(logo_t, ((1080 - 720) // 2, 900 - 360))
    save_rgb(tall, BRAND / "logo-splash-portrait.png")

    print("wrote", BRAND / "logo-app.png")
    print("wrote", PUBLIC / "icon.png")
    print("wrote", PUBLIC / "icon-512.png")
    print("wrote", PUBLIC / "apple-touch-icon.png")
    print("wrote", PUBLIC / "favicon.png")
    print("wrote", BRAND / "logo-splash.png")
    print("wrote", BRAND / "logo-splash-portrait.png")


if __name__ == "__main__":
    main()
