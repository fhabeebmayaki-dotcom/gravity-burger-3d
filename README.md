# GRAVITY — Burgers That Defy Gravity

A premium, scroll-driven demo website for a burger brand. The hero is the
famous "Apple-style" scroll film: a double cheeseburger levitating over a
black studio background that **plays forward and backward with the visitor's
scroll**. No build step, no server, no paid services — plain HTML, CSS and
JavaScript plus two folders of images. Deploy it to GitHub Pages, Netlify,
Vercel or any static host, including under a subfolder (all asset paths are
relative).

```
index.html      style.css      main.js
poster.jpg                    ← frame-0 still / no-JS & slow-connection fallback
frames/          frame_0001.webp … frame_0147.webp   (desktop, 1600×904, ~14 MB)
frames-mobile/   frame_0001.webp … frame_0098.webp   (mobile,  900×508, ~4.7 MB)
images/                       ← menu / craft / story photography
SOURCE.md                     ← where the hero film came from, licence, exact commands used
```

---

## 1. What the scroll effect is, and how it was made

There is **no 3D engine running in the browser**. The "3D" is a short product
film that was sliced into still frames. Scroll position is the playhead:

1. A locked-camera product film (5 seconds, one product, one continuous
   motion, clean studio background, no text or logos in frame).
2. The film was sliced into **147 frames** (desktop) and **98 frames**
   (mobile) with ffmpeg and encoded as WebP quality 80 — see `SOURCE.md` for
   the exact commands used for this site's film.
3. In the browser, all frames preload behind a progress indicator that shows
   the **real** percentage loaded. Priority frames (first, 25%, 50%, 75%,
   last) load first so the opening image is sharp instantly.
4. The frames are drawn onto a single `<canvas>` (never an `<img>` swap —
   that flickers). Drawing uses **cover-crop maths** so the film fills any
   screen without stretching, at a device-pixel-ratio capped at 2.
5. Scroll is smoothed twice, which is what makes it feel expensive:
   **Lenis** smooth-scroll (lerp 0.1) driven from **GSAP's** ticker (one
   clock, `lagSmoothing(0)`), and a GSAP **ScrollTrigger** tween with
   `scrub: 1` mapping scroll progress → frame index inside a 400vh-tall
   section with a sticky full-screen stage.
6. Three headline beats ride the *same* timeline, so the words and the film
   are choreographed together. A soft contact shadow under the burger
   shrinks as it floats, the way a real shadow would.
7. Safety nets: if a frame is missing or still loading, the nearest loaded
   frame is drawn instead of a blank canvas; if the GSAP CDN fails, a
   built-in native-scroll engine takes over; `prefers-reduced-motion`
   visitors get a still frame; no-JavaScript visitors get the poster photo
   and all the copy.

Why frames instead of real-time WebGL? Because the light, reflections and
particles are *baked into every frame by the film* — it looks identical and
photoreal on every device, including a five-year-old phone, with zero GPU
lottery. This is the same technique behind Apple's product pages.

## 2. Swap in your own product film / frames

You need: one product, one transformation (rotation, opening, assembly,
levitation…), one locked camera, 5–8 seconds.

1. **Shoot or generate the film.** Best results come from a start still and
   an end still that are identical except for the product's state, animated
   between the two with an image-to-video tool (Google Flow / Veo, Kling,
   Seedance) prompted with: *"camera completely locked, no zoom, no pan,
   only the product transforms, slow and smooth."* Or render an image
   sequence straight out of Blender. Keep text and logos **out** of the
   film — add them as real HTML text instead (AI video mangles lettering).
   Match the film's background colour to the site's background (`#050505`)
   so the frames blend seamlessly.
2. **Slice it** with ffmpeg (free):

   ```bash
   # Desktop set — ~150 frames is the sweet spot (duration × fps)
   ffmpeg -i product.mp4 -vf "fps=18,scale=1600:-2" -q:v 3 frames_master/frame_%04d.jpg

   # Convert to WebP q80 (this site used ffmpeg's libwebp; cwebp works too)
   for f in frames_master/*.jpg; do
     ffmpeg -i "$f" -c:v libwebp -quality 80 -compression_level 6 "frames/${f%.jpg}.webp"
   done

   # Mobile set — smaller AND fewer frames (cut frames before quality)
   ffmpeg -i product.mp4 -vf "fps=14,scale=900:-2" -q:v 4 frames_mobile_master/frame_%04d.jpg
   # …then convert the same way into frames-mobile/
   ```

   Budgets to respect: desktop set ≤ ~15 MB total, mobile ≤ ~5 MB.
   Name files exactly `frame_0001.webp`, `frame_0002.webp`, … (zero-padded).
3. **Export a poster:** pick a strong early frame —
   `ffmpeg -ss 0.35 -i product.mp4 -frames:v 1 -vf "scale=1600:-2" -q:v 3 poster.jpg`
4. **Tell the site about your frames.** In `main.js`, edit the `SETS` block:

   ```js
   var SETS = {
     desktop: { dir: 'frames/',        count: 147, pad: 4 },
     mobile:  { dir: 'frames-mobile/', count: 98,  pad: 4 }
   };
   ```

   Set `count` to your frame counts. That's the only code change needed.
5. **Change the background colour** if your film isn't on black: `--bg` in
   `style.css`, the `<meta name="theme-color">` in `index.html`, and the
   stage background must all match your film's background.

## 3. Rebrand and reprice

| What | Where |
|---|---|
| Brand name, headlines, all copy | `index.html` (search for "GRAVITY", "ZERO GRAVITY", etc.) |
| Colours, fonts, spacing | `style.css` — the `:root` variables at the top (`--accent` is the one colour that matters most) |
| Menu dishes, descriptions, **prices** | `index.html` — each dish card: change the visible `$16` **and** the `data-price="16"` on its Add button (the cart reads `data-price`) |
| Dish / story photos | Replace the files in `images/` (keep the same filenames, or update the `src` in `index.html`) |
| Tax rate at checkout | `main.js` — `var TAX_RATE = 0.085;` (8.5%) |
| Opening hours, address | `index.html`, the "Visit" section |
| Scroll length of the hero | `style.css` — `#sequence{height:400vh}` (300vh on mobile). Longer = slower film |

## 4. Wiring real payments

The checkout is a front-end demo: it totals the cart, adds tax, and shows a
confirmation with a generated order number. No money moves. To take real
orders, pick one:

- **Simplest — payment links:** create Stripe Payment Links (or Square /
  PayPal links) for each dish and point each "Add to order" button at them.
  No backend at all; you lose the combined cart total.
- **Proper cart checkout:** keep this cart UI, and on the Checkout button
  (`#checkoutBtn` in `main.js`) POST the cart contents to a tiny serverless
  function (Vercel/Netlify function, or a Stripe-hosted checkout session
  created by a small backend) and redirect the customer to the returned
  checkout URL. The cart already lives in one `cart` object in `main.js` —
  `id → {name, price, qty}` — so the payload is one `JSON.stringify(cart)`.
- **Full online ordering:** hand the menu to Toast, Square Online or
  Shopify and link "Order" buttons out to it.

Also before going live: replace the `.example` contact email in the Visit
section, swap in your own photography if you change the menu, and update the
film credit in the footer if you replace the hero film (`SOURCE.md` explains
the current film's licence — Pixabay Content License, free for commercial
use, no attribution required, but the footage itself may not be resold as
standalone stock).

## 5. Performance notes (for whoever maintains this)

- Total first load is dominated by the frame set: ~14 MB desktop / ~4.7 MB
  mobile. That's deliberate (it's the whole effect) and it's why the rest of
  the page is kept plain and light. Host frames on a CDN with long cache
  headers; if you ever replace them, rename the folder (`frames-v2/`) rather
  than fighting caches.
- Everything animated on scroll uses only `transform` and `opacity`. Don't
  add scroll-linked `width/top/box-shadow` animations — that's what makes
  copies of this technique stutter.
- Test on a real mid-range phone, scroll **up** as much as down, and check
  `prefers-reduced-motion` once before launch.
