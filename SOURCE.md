# Flagship 3D — Frame Sequence Source Notes

## Product chosen
**A double cheeseburger levitating over a dark surface, crumbs and sesame
particles suspended in the air around it** — shot straight-on with a locked
camera against a pure-black studio background. Premium fast-food / burger-brand
hero (priority concept #1 family: burger). The burger fills ~55% of frame
width, sits dead centre, and is tack-sharp in every frame.

## Source film
- **Page:** https://pixabay.com/videos/hamburger-food-sandwich-meat-beef-307837/
- **Direct file used:** https://cdn.pixabay.com/video/2025/10/04/307837_large.mp4
- **Uploader:** davidexyz — https://pixabay.com/users/davidexyz-9822790/
- **Uploaded to Pixabay:** 2025-10-05 (per page metadata). Listed on Pixabay
  as AI-generated content.
- **Licence:** Pixabay Content License (https://pixabay.com/service/license-summary/)
  — free to use, including commercially, for the demo website; attribution not
  required; may not be resold/redistributed as standalone stock footage.
  No logos, text, people or watermarks anywhere in the frames (the burger is a
  generic, unbranded product — safe for a sellable demo).

## Original film specs (ffprobe, verified)
- Container/codec: MP4 / H.264
- Resolution: **1912 × 1080** (≥1080p ✓)
- Frame rate: **30 fps**
- Duration: **5.10 s**
- File size: 3,041,725 bytes

## Segment used
- **0.10 s → 5.00 s** (4.90 s). Head/tail micro-trims only — the burger is in
  frame and levitating for the entire clip; no cuts, no camera movement.

## Extraction — exact commands run
`cwebp` is not installed on this VM, so WebP encoding was done with ffmpeg's
`libwebp` encoder (the same libwebp library cwebp wraps), quality 80,
compression level 6.

Desktop set (147 frames, 1600 × 904):
```bash
ffmpeg -ss 0.10 -i 307837_large.mp4 -t 4.90 \
  -vf "fps=30,scale=1600:-2" \
  -c:v libwebp -quality 80 -compression_level 6 \
  frames/frame_%04d.webp
```
Sampled at the native 30 fps (not the report's 18 fps starting point) because
the usable segment is only 4.9 s — 18 fps would have produced ~88 frames,
below the 120-frame smoothness floor. 147 frames lands inside the report's
120–180 target.

Mobile set (98 frames, 900 × 508):
```bash
ffmpeg -ss 0.10 -i 307837_large.mp4 -t 4.90 \
  -vf "fps=20,scale=900:-2" \
  -c:v libwebp -quality 80 -compression_level 6 \
  frames-mobile/frame_%04d.webp
```
The mobile set was first encoded at 30 fps like the desktop set and came to
6.9 MB — over the ~5 MB mobile budget. Per the research report's rule
("cut frames before touching quality"), it was re-encoded at 20 fps with
quality unchanged: **98 frames, 4,704,448 bytes**.

Poster (frame at 0.35 s, JPG):
```bash
ffmpeg -ss 0.35 -i 307837_large.mp4 -frames:v 1 \
  -vf "scale=1600:-2" -q:v 3 poster.jpg
```

## Final asset sizes (verified)
| Set | Frames | Dimensions | Total bytes | Budget |
|---|---|---|---|---|
| `frames/` (desktop WebP q80) | 147 | 1600 × 904 | **14,339,074** (~95 KB/frame avg) | ≤ ~15 MB ✓ |
| `frames-mobile/` (WebP q80) | 98 | 900 × 508 | **4,704,448** | ≤ ~5 MB ✓ |
| `poster.jpg` | 1 | 1600 × 904 | 156,252 | — |

## Honest notes on the motion (read before building)
- The transformation in this clip is a **slow levitation drift of the burger
  plus continuous airborne particle motion** (crumbs/sesame seeds float and
  swirl around it). It is **not** a layer-by-layer assembly and **not** a
  ≥180° rotation — across the 4.9 s the burger stays front-on while rising/
  settling slightly, and the particle field changes completely frame to frame,
  so a scroll scrub reads as the product floating in suspended motion rather
  than rotating. First/middle/last frames were visually verified.
- Why this clip anyway: ~34 candidate clips were downloaded and frame-checked
  across Pixabay and Mixkit (Pexels, Coverr and Videvo could not be fetched
  from this VM — bot wall / API key required). **No reachable free clip
  offered a photoreal layer-by-layer burger assembly or a full product
  turntable at ≥1080p with a clean studio background.** Closest alternatives,
  rejected:
  - Pixabay 312896 — a genuine exploded-view burger assembly, but on a bright
    chroma-green background, product only ~35% of frame, composited look, and
    the first ~1.5 s is an empty green screen.
  - Pixabay 356623 / 362785 — gorgeous photoreal burgers on rustic wood, but
    the *camera* arcs slowly (~30–45°) around an already-assembled burger;
    background is a restaurant interior, not studio.
  - All perfume/sneaker/car turntable candidates were static poses, driving
    shots, hand-held sprays, or cartoon AI renders.
- This clip was the only one that satisfies every hard requirement at once:
  one product, one continuous motion, locked camera, clean black studio
  background (matches a dark site background exactly — use `#000`/near-black
  as the section background so frames blend seamlessly), no text/logos,
  1912×1080 source, 5.1 s duration, product large and centred.
- Compression note: the floating particles cost bytes (busy detail in every
  frame) — that is why the desktop set sits near the top of its budget at
  14.3 MB despite the black background. Do not add baked-in grain on top.
