# Foreground clouds

16 clouds, 4 per screen corner. File name = corner + role:

- `tl` / `tr` / `bl` / `br`: top-left, top-right, bottom-left, bottom-right
- `a-corner` (largest, in the corner) · `b-edge` (along the top/bottom edge) · `c-side` (down/up the side edge) · `d-inner` (smallest, nearest the clear middle)

Sizes are at the desktop reference (1920×1080, 3 screen px per art px). `_preview.png` shows all 16 at 2×.

Paint with exactly these three colours plus transparency. The game swaps each one for a live colour (white by day, warm at sunrise/sunset, blue-grey at night):

| Tone | Colour |
|---|---|
| Shadow | `#9FB4D0` |
| Mid | `#D6E3F0` |
| Highlight | `#FFFFFF` |

Any canvas size works. Keep the flat base along the bottom row.
