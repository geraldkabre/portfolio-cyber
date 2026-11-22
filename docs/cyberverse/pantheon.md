# Visionaries — a revolving ring of liquid‑glass scenes

> A full‑viewport, physics‑driven hero. Nine cinematic “worlds” ride a circle around a centred caption; whichever sits at the **top** is the chosen one — a touch larger, full colour — and **its** scene fills the whole stage behind real refracting glass. Turn the ring (drag, trackpad, chevrons, keys, or just wait) and the next world climbs to the top, the backdrop cross‑fades to it, and the caption re‑sets. Every disc is a real **Snell’s‑law glass lens**, not a blur.

This document is the complete source of truth. Build it to the numbers below and it will be pixel‑accurate.

---

## 1. At a glance

| | |
|---|---|
| **Footprint** | One full‑viewport section: `100vw × 100vh`, `overflow: hidden`. |
| **Items** | 9 scenes on a ring; one is at top (the “focal”). |
| **Backdrop** | The focal scene, full‑bleed `cover`, dimmed; cross‑fades on rotation. |
| **Discs** | Circular glass medallions, each showing a thumbnail of its scene, framed by a clear refractive glass ring. |
| **Centre** | The focal scene’s **title** (large) + a one‑line **caption** (small, tracked uppercase). |
| **Navigation** | Drag · trackpad/wheel · tap a disc · ◂ ▸ chevrons · ← → ↑ ↓ keys · patient auto‑rotate. |
| **Engine** | One `requestAnimationFrame` loop drives every per‑frame transform; one entrance timeline; one shared SVG glass filter. |
| **Themes** | **Dark in both themes** — the dark scene imagery sets the contrast (light ink over dark art), so the section does *not* flip with the site's light/dark theme. |
| **Tone** | Cinematic, calm, premium. Near‑black stage, warm‑white ink, no saturated UI colour. |

---

## 2. Structure (DOM / layer order, back → front)

```
section.vis-root                      // the stage; pointer + wheel handlers live here
 ├─ .vis-bgwrap                       // entrance target (opacity/scale/blur)
 │   └─ .vis-bg  × 9                  // one full‑bleed layer per scene (cross‑fade by opacity)
 ├─ .vis-vignette                     // static dark radial framing
 ├─ .vis-glow                         // soft warm radial behind the title (screen blend)
 ├─ svg.vis-defs (hidden)             // the shared displacement filter #vis-glass (native glass only)
 ├─ .vis-orbit                        // the ring container (inset:0)
 │   └─ .vis-med  × 9                 // a glass disc (the box stays a fixed size; visual size = transform scale)
 │        ├─ .vis-med-face            // inset 16%, overflow hidden → the scene thumbnail
 │        │    └─ img.vis-med-img
 │        └─ .vis-med-rim             // the glass edge: specular + transmitted glow + inner shadow
 ├─ .vis-title                        // centred title + caption
 │    ├─ h2.vis-title-name            // scene TITLE
 │    └─ .vis-title-sub               // scene CAPTION
 ├─ button.vis-chev.vis-chev-left     // ◂  (hidden on phones)
 └─ button.vis-chev.vis-chev-right    // ▸  (hidden on phones)
```

`z-index`: backdrop `0` → vignette/glow `0` → title `60` → discs `100–220` (computed per‑frame) → chevrons `300`.

---

## 3. Colour, tokens & type

Tokens (scoped to the section root). **One palette, used in both site themes** — the dark scene art dictates the contrast, so the ink is always light; the section does **not** flip with `html[data-theme]` (a light variant would put dark text over dark imagery):

```
--vis-stage:    #0b0908;                 /* page bg behind everything (the scene covers it) */
--vis-ink:      #f3ece0;                 /* primary text — always light */
--vis-ink-soft: rgba(243,236,224,.60);   /* caption / secondary */
--vis-chrome:   rgba(243,236,224,.50);
--vis-vignette: radial-gradient(125% 100% at 50% 44%, transparent 32%, rgba(7,5,4,.50) 72%, rgba(5,4,3,.90) 100%);
```

**Type — two families only:**

- **Title** → *Poppins*, weight **500** (never bold). Google Fonts: `https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap`.
- **Caption / chrome** → a neutral grotesque (the reference uses *Geist Sans*; any clean sans works). Google Fonts (Geist): `https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap`.

No serif anywhere. No saturated UI colour — accents are sampled from the art, used only as soft glows (see §11).

---

## 4. The stage & backdrop

- Root: `position: relative; height: 100vh; width: 100%; overflow: hidden; background: var(--vis-stage); user-select: none; cursor: grab;` (`:active { cursor: grabbing }`).
- `.vis-bgwrap { position:absolute; inset:0 }`.
- Each `.vis-bg` (one per scene):
  - `position:absolute; inset:0; background-size:cover; background-repeat:no-repeat;`
  - `background-position:` the scene’s **focus** (see §17 data; default `50% 50%`).
  - `filter: brightness(.60) saturate(.95);`
  - `will-change: opacity, transform;`
  - **Ken Burns** drift: `animation: vis-kenburns 34s ease-in-out infinite alternate;`
    ```
    @keyframes vis-kenburns{ from{transform:scale(1) translate(0,0)} to{transform:scale(1.04) translate(-0.6%,-0.8%)} }
    ```
  - Initial opacity: the focal scene `1`, all others `0`.
- **Cross‑fade (per frame):** for layer `i`, `opacity = clamp(1.05 − |off_i|, 0, 1)` where `off_i` is its signed ring offset (see §6). The two scenes bracketing a transition always sum to ≈ 1 (no dark dip).
- `.vis-vignette { position:absolute; inset:0; background:var(--vis-vignette); pointer-events:none }`.
- `.vis-glow` (warm bloom behind the title): `position:absolute; left:50%; top:55.5%; width:42vmin; height:42vmin; transform:translate(-50%,-50%); background:radial-gradient(closest-side, rgba(229,214,184,.45), transparent); filter:blur(44px); mix-blend-mode:screen; pointer-events:none;` opacity is driven 0 → `0.32` by the entrance.

> Backdrop is **always `cover`** (full‑bleed, no bars). Portrait‑format art is framed by its focus point so the subject reads; never letterbox.

---

## 5. The ring — geometry (exact)

Let `W,H` = stage size, `S = min(W,H)`, and `phone = S < 640`.

```
N            = 9                         // scenes
ringRadius   = S * (phone ? 0.38 : 0.34) // px — sized off the SHORTER side so it’s a circle on any aspect
ringCY       = H * 0.055                 // ring centre nudged BELOW stage centre (clears top chrome)
stepAngle    = 2π / N                    // 40° between slots
cardBox d0   = round( clamp( S * (phone ? 0.21 : 0.17), 60, 184 ) )  // the fixed box every disc is laid out at
```

Carousel position `pos` is a continuous float (the resting integer = the focal index). For disc `i`:

```
off      = wrapOff(i − pos)              // signed shortest distance, wrapped to ±N/2
ang      = −π/2 + off * stepAngle + spin // −90° = top of the circle (+spin only during entrance, §12)
bx       = cos(ang) * ringRadius * er    // er = 1 at rest (entrance contracts it, §12)
by       = ringCY  + sin(ang) * ringRadius * er
```

`wrapOff(d)`:
```
o = ((d % N) + N + N/2) % N − N/2;  if (o === −N/2) o = N/2;  return o
```

Each `.vis-med` is absolutely centred (`left:50%; top:50%; transform: translate(-50%,-50%) …`) then offset by `(bx, by)`. **The box is always `d0 × d0`; the visible size comes from `transform: scale()`** — this keeps the one shared glass map valid for every disc.

---

## 6. Per‑disc state (every frame)

```
topness = smoothstep( clamp(1 − |off|, 0, 1) )         // 1 at the top slot, 0 by one slot away
s       = 0.86 + 0.32 * topness                        // BASE_SCALE + TOP_EMPHASIS·topness → focal disc = 1.18×
lift    = 7 * topness                                  // px the focal disc rises
z       = round( 100 + topness*120 − by*0.02 )         // focal + front‑most on top

transform = translate(-50%,-50%) translate(bx, by − lift) scale( s · eScale )   // eScale = entrance bloom, §12
opacity   = le                                          // le = staggered entrance, §12
visibility= le < 0.02 ? hidden : visible
```

Thumbnail image filter (off‑focal discs drain toward monochrome so the top one pops):
```
grayscale( clamp((1 − topness) * 0.55, 0, 0.55) )
sepia( tone === ink ? 0.14 : tone === photo ? 0.08 : 0 )   // tone per scene; default 0
brightness( 0.90 + 0.10 * topness )
blur( (1 − le) * 8px )                                      // sharpens in during entrance
```

Rim opacity: `0.42 + 0.40 * topness` (the focal disc’s glass edge is the brightest).

`smoothstep(t) = t·t·(3 − 2t)`.

---

## 7. The liquid‑glass medallion (the signature)

Each disc is a **circular glass lens** that genuinely refracts the scene behind it at its rim — not a frosted blur. Structure: an outer glass disc → an inset **face** (the scene thumbnail) → a **rim** overlay (the lit edge).

### 7.1 Disc, face, rim — CSS

```css
.vis-med{
  position:absolute; left:50%; top:50%;
  width:150px; height:150px;           /* overwritten to d0 px in JS; scale() does the rest */
  border-radius:50%;
  transform:translate(-50%,-50%);
  background:rgba(240,244,250,.04);     /* faint cool tint of the glass body */
  cursor:pointer;
  will-change:transform,opacity;
  box-shadow:
    0 20px 46px rgba(0,0,0,.45),
    0 3px 10px rgba(0,0,0,.34),
    inset 0 0 0 1px rgba(255,255,255,.10);
}
.vis-med-face{                          /* the scene thumbnail, recessed into the glass */
  position:absolute; inset:16%;         /* FACE_INSET — the clear glass ring around it */
  border-radius:50%; overflow:hidden;
  background:#0b0907;
  box-shadow:
    inset 0 0 7px rgba(0,0,0,.40),
    0 0 0 1px rgba(255,255,255,.16),
    0 2px 6px rgba(0,0,0,.45);
  pointer-events:none;
}
.vis-med-img{ display:block; width:100%; height:100%; object-fit:cover; pointer-events:none; -webkit-user-drag:none; }

.vis-med-rim{                           /* the glass EDGE drawn over everything */
  position:absolute; inset:0; border-radius:50%; pointer-events:none;
  background:
    radial-gradient(circle at 50% 8%,  rgba(255,255,255,.34), rgba(255,255,255,0) 40%),   /* top specular */
    radial-gradient(circle at 72% 80%, rgba(255,250,242,.12), rgba(255,250,242,0) 30%);   /* transmitted glow */
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,.50),     /* crisp lit top edge */
    inset 0 0 0 1px rgba(255,255,255,.16),      /* thin bright ring   */
    inset 0 -7px 16px rgba(0,0,0,.26),          /* lower depth        */
    0 0 0 1px rgba(0,0,0,.20);                  /* outer definition   */
}
```

Thumbnail framing per scene: `object-position:` the scene’s **thumbFocus** and a `transform: scale(thumbScale)` (see §17) so the glowing element of each scene fills its little circle.

### 7.2 The refraction (what makes it glass)

A single SVG filter is built **once** and shared by every disc via `backdrop-filter: url(#vis-glass)`. The medallion’s base backdrop chain:

```
native (Chromium):  url(#vis-glass) blur(0.4px) saturate(1.16) brightness(0.97)
fallback (others):  blur(3px) saturate(1.12) brightness(0.95)
```

The filter is a **physical convex‑lens displacement map**:

- Model each disc as a glass slab whose top is flat in the middle and curves down to the backdrop across a **bezel** band at the rim (a convex squircle: `y = (1 − (1 − t)⁴)^¼`). Refract a straight‑down ray with **Snell’s law** (air n=1 → glass n=1.5) and record the lateral landing offset per pixel → near zero across the flat interior, peaking just inside the rim. Bake those vectors into an image (`R = x‑offset, G = y‑offset`, normalised around 128; `color‑interpolation‑filters="sRGB"` is mandatory).
- Parameters (for the `d0` box): **bezel = d0 × 0.16**, **thickness = 34**, radius = d0/2.
- **Chromatic aberration:** three `feDisplacementMap` passes (R over‑refracts, B under‑refracts by ~5% × **chroma 2.2**), each isolated to its channel and screen‑blended back — the rainbow fringe appears only at the rim, where light actually bends.
- **Living wobble (the “liquid” feel):** every frame, multiply the displacement scale by
  ```
  wob = 1 + 0.38 * ( sin(t·0.0015) + 0.38·sin(t·0.0034 + 1.2) + 0.22·sin(t·0.0061 + 2.4) )
  ```
  (three layered swells → an organic, non‑repeating ripple). Apply per channel: R ×(1+0.05·chroma)·wob, G ×wob, B ×(1−0.05·chroma)·wob. Run only while the section is on‑screen (backdrop‑filter is GPU‑heavy).

> **Fallback:** `backdrop-filter: url(#…)` is Chromium‑only (Safari/Firefox render nothing and lie to `@supports`, so sniff the UA). Everywhere else, drop to the frost chain above. Every other layer (rim, specular, shadow) still renders — only the live lensing is Chromium’s.

---

## 8. The centred title

```css
/* top = 50% + RING_CY → the RING's centre (not the screen's), so the title is
   centred inside the circle even though the ring is pushed down to clear chrome */
.vis-title{ position:absolute; left:0; right:0; top:55.5%; transform:translateY(-50%);
            text-align:center; color:var(--vis-ink); pointer-events:none; z-index:60; padding:0 24px; }

.vis-title-name{                         /* the scene TITLE */
  font-family:"Poppins",system-ui,sans-serif; font-weight:500;
  font-size:clamp(21px, 3vw, 37px); line-height:1.16; letter-spacing:.015em; margin:0;
  max-width:min(46vw, 470px); margin-inline:auto; text-wrap:balance;   /* long titles wrap to 2 lines inside the ring */
  text-shadow:0 2px 30px rgba(0,0,0,.55);
}
.vis-title-sub{                          /* the CAPTION */
  margin-top:16px; font-size:12px; letter-spacing:.32em; text-indent:.32em;
  text-transform:uppercase; color:var(--vis-ink-soft); min-height:1.2em;
}
```

On each scene change, both lines **remount** (key on the focal index) so they replay their reveal:

```
@keyframes vis-rise{ from{opacity:0; transform:translateY(26px); filter:blur(8px)} to{opacity:1; transform:translateY(0); filter:blur(0)} }
@keyframes vis-fade{ from{opacity:0; transform:translateY(6px)}            to{opacity:1; transform:translateY(0)} }
.vis-title-name{ animation:vis-rise .7s cubic-bezier(.22,1,.36,1) both }
.vis-title-sub { animation:vis-fade .55s ease .12s both }
```

The title must fit the gap **between the 3‑ and 9‑o’clock discs** — hence the `max-width`/`text-wrap:balance` (e.g. “Daniel in the Lions’ Den” wraps to two lines; “The Mirror” stays one).

---

## 9. Chevrons

```css
.vis-chev{
  position:absolute; top:50%; transform:translateY(-50%);
  width:44px; height:44px; border-radius:50%; display:grid; place-items:center;
  color:var(--vis-ink); background:rgba(10,8,6,.34); border:1px solid rgba(255,255,255,.10);
  backdrop-filter:blur(8px) saturate(1.04) brightness(.92);
  box-shadow:0 6px 18px rgba(0,0,0,.42), inset 0 1px 1px rgba(255,255,255,.12);
  opacity:.72; cursor:pointer; z-index:300;
  transition:background .25s, transform .25s, opacity .25s;
}
.vis-chev:hover{ opacity:1; background:rgba(10,8,6,.50); }
.vis-chev:active{ transform:translateY(-50%) scale(.92); }
.vis-chev-left { left:clamp(14px,3vw,40px); }
.vis-chev-right{ right:clamp(14px,3vw,40px); }
```

Each holds a 22×22 stroked chevron (`stroke-width:1.6`, round caps). Left = rotate −1, right = +1. `aria-label="Rotate left/right"`. **Hidden on phones** (≤640px) — drag/tap/auto cover it there.

---

## 10. Motion — on‑load entrance (the opening)

One timeline, `delay 0.15s`, two tracks running together:

**A. Backdrop bloom** (the `.vis-bgwrap`): from `{opacity:0, scale:1.12, filter:blur(20px)}` → `{opacity:1, scale:1, filter:blur(0)}` over **2.0s**, `ease: power3.out`.

**B. The ring winds up + blooms outward.** A single eased progress `enter: 0 → 1` over **2.7s**, `ease: power4.out`. From it, per frame:

```
enterEased = smoothstep(enter)
spin       = (1 − enterEased) * 2.4      // radians the whole ring is pre‑rotated, unwinding into place (~137°)
er         = 0.5 + 0.5 * enterEased       // ring radius starts contracted at the centre, blooms to full
```

Each disc also blooms in, **staggered top‑first**:
```
stg     = (clamp(|off|, 0, N/2) / (N/2)) * 0.5
le      = smoothstep( clamp( (enter − stg) / (1 − stg), 0, 1 ) )
eScale  = 0.3 + 0.7 * le                  // bloom up from 30%
opacity = le                              // fade in
blur    = (1 − le) * 8px                  // on the thumbnail
```

Net effect: the discs start small, blurred and clustered near the centre, **rotated ~137° off their final angles**, then spin up and expand outward into the circle as they sharpen and fade in — the focal disc’s size emphasis (`0.32·topness`) is present throughout (it’s the larger one as it arrives). The backdrop blooms behind; the title rises in. Everything settles by ≈ 3.05s.

`smoothstep` as in §6. (No particles, no letter‑by‑letter — a single coordinated wind‑up.)

---

## 11. Motion — rotation / switching

- **One step = one slot.** `rotateTo(target)` tweens `pos` from current → target over **STEP_DUR = 1.0s** using **ease‑in‑out‑expo** (snappy: holds, punches through the middle, holds):
  ```
  easeInOutExpo(t) = t≤0 ? 0 : t≥1 ? 1 : t<0.5 ? 2^(20t−10)/2 : (2 − 2^(−20t+10))/2
  ```
- As `pos` moves, the backdrop cross‑fades (§4) and the title’s focal index flips at the half‑way mark, remounting the caption.
- **Per‑scene accent** is available for soft glows (the centre `.vis-glow` may take the focal scene’s `accent`); keep it subtle, never a hard UI colour.

---

## 12. Interactions (exact behaviour)

All handlers live on the section root. `markInput()` stamps “user touched it” (pauses auto‑rotate for `USER_IDLE = 4400ms`).

**Drag‑to‑rotate** (pointer — one handler for mouse **and** touch, so finger‑drag on phones works):
- `pointerdown` (button 0, not on a chevron): capture the pointer; record start x, start `pos`, and the disc under the press (`downIndex`, via a `data-index` attribute).
- `pointermove` while dragging: `pos = startPos − dx / perStep`; track velocity. `perStep` is **responsive** so a swipe feels the same on any screen: `260px` on desktop, but on phones (`width < 640`) `clamp(width * 0.38, 130, 260)` — i.e. ~⅓ of the screen, so one comfortable thumb‑swipe (~130px) = one card.
- `pointerup`: if it **didn’t move** (`|dx| ≤ 4px`) and landed on a disc → `goTo(downIndex)` (rotate that disc to the top). Otherwise **flick‑project** and snap: `rotateTo( round( pos + projection ) )`, where the velocity projection is gentler on phones so the sensitive ratio doesn’t overshoot to two cards — desktop `clamp(vel*6, −1.2, 1.2)`, phones `clamp(vel*2.4, −0.5, 0.5)`.
- `touch-action: pan-y` so vertical page scroll still passes through; horizontal drag rotates.

**Tap a disc** → it rotates to the top (handled in `pointerup` as above).

**Trackpad / wheel** (hover‑gated; `preventDefault`). Must fire **exactly one step per flick** despite Mac inertia. Accumulate `deltaY + deltaX`; a flick’s momentum only ever *decays*, a new flick *spikes*:
```
on wheel (dy):
  mag = |dy|; prev = lastMag; lastMag = mag
  if (now − lastTime > 140ms) { acc = 0; locked = false; peaked = false }   // gesture (incl. momentum) ended
  lastTime = now
  if (locked){                                  // already stepped this flick
     if (mag < prev) peaked = true              // momentum has begun to decay
     if (!(peaked && mag > prev + 10)) return    // swallow the tail
     locked = false; peaked = false; acc = 0     // a real re‑acceleration → re‑arm
  }
  acc += dy
  if (|acc| >= 88){ step(sign(acc)); acc = 0; locked = true; peaked = false }   // WHEEL_THRESHOLD = 88
```

**Keyboard** (hover‑gated): `→`/`↓` = +1, `←`/`↑` = −1 (`preventDefault`).

**Chevrons:** ◂ = −1, ▸ = +1.

**Auto‑rotate:** a 360ms interval advances `pos` by +1 **only when** the entrance has finished, the section is in‑view & the tab is visible, not dragging, **and** `now − lastInput ≥ 4400ms` **and** `now − lastAdvance ≥ AUTO_INTERVAL (3600ms)`. So it dwells ~3.6s per scene, pauses the moment you interact, and resumes after ~4.4s idle.

`goTo(i)` = `rotateTo(pos + wrapOff(i − pos))` (shortest way round). `step(dir)` = `rotateTo(round(pos) + dir)`.

---

## 13. Responsiveness

Everything scales off `S = min(W,H)`, so it’s fluid by default. One explicit phone breakpoint at **≤ 640px** (`phone = S < 640`):

| | Desktop / tablet | Phone (≤640px) |
|---|---|---|
| Card box `d0` | `clamp(S·0.17, 60, 184)` | `clamp(S·0.21, 60, 184)` — **bigger discs** so the scenes read |
| Ring radius | `S·0.34` | `S·0.38` — **roomier** ring so the bigger discs don’t collide |
| Chevrons | shown | **hidden** — finger‑drag/tap/auto only |
| Drag ratio `perStep` | `260px` per card | `clamp(S·0.38, 130, 260)` — lighter, so one thumb‑swipe = one card |
| Title | `clamp(21px,3vw,37px)`, `max-width:min(46vw,470px)` | `clamp(19px,5.2vw,26px)`, `max-width:50vw` |
| Caption | `12px`, `ls .32em` | `10px`, `ls .24em` |

The ring is sized off the **shorter** side, so it stays a circle in portrait *and* landscape. Verify both 390×844 (phone portrait) and 1440×900 (desktop).

---

## 14. Accessibility & reduced motion

- `@media (prefers-reduced-motion: reduce)`: skip the entrance (render settled instantly), stop Ken Burns, and set title/caption animation durations to `.01ms`. The glass wobble and auto‑rotate also do not run.
- Chevrons are real `<button>`s with `aria-label`s; decorative layers are `aria-hidden`.
- Thumbnails carry `alt` = the scene title.
- The section never traps scroll: vertical swipes/scroll pass through (`touch-action: pan-y`; the wheel handler only acts while the pointer is over the stage).

---

## 15. Implementation notes (to reproduce the feel exactly)

- **One rAF clock** owns everything per‑frame: advance the `pos` tween, publish the focal index (the only thing that triggers a re‑render, for the caption), breathe the glass, cross‑fade the backdrop, and place all 9 discs. Never animate position with CSS transitions — it must be frame‑driven.
- **One shared glass filter.** All 9 discs reference the same `#vis-glass`; the displacement map is baked once for the `d0` box and re‑baked only on resize. Per‑disc visual size is a `transform: scale()`, never a new map.
- **Transforms only** for motion (`translate` + `scale`), `opacity`, and `filter` — all compositor‑friendly. Set `will-change: transform, opacity` on discs and the backdrop wrap.
- **Re‑bake the glass map on resize** (debounced via `ResizeObserver`).
- Gate the wobble and heavy work on an `IntersectionObserver` (don’t run the GPU lens off‑screen).

---

## 16. Assets

### 16.1 Fonts
- Poppins 400/500/600 and a neutral grotesque (Geist 400/500) — Google Fonts URLs in §3.

### 16.2 Scene images (9) — static URL references

16:9 landscape, cinematic/atmospheric renders. Source ≈ 1792×1024; deliver ≤ 2200px wide, JPEG ~300–460 KB each. Host on any static CDN and reference by URL (swap the base for yours):

| # | id | URL (static reference) | Scene |
|---|---|---|---|
| 1 | `emerald-gate` | `{CDN}/visionaries/emerald-gate.jpg`   | Dark jungle‑river canyon at night; a glowing **green‑gold portal/monolith** on a fern island mid‑river, mirrored in still water; fireflies, mist. |
| 2 | `mirror`       | `{CDN}/visionaries/mirror.jpg`         | Misty green rolling hills under an overcast sky; a tall **mirrored monolith** reflecting the landscape. Serene, daytime. |
| 3 | `crossing`     | `{CDN}/visionaries/crossing.jpg`       | A living, grass‑covered **land‑bridge arch** spanning a fog‑filled canyon between jagged peaks; two tiny figures atop; golden haze. |
| 4 | `threshold`    | `{CDN}/visionaries/threshold.jpg`      | Night mountains under the Milky Way; a massive **stone gateway** glowing amber within, stone steps leading up. |
| 5 | `awakening`    | `{CDN}/visionaries/awakening.jpg`      | Dramatic **pink/orange dawn cloudscape**; a dark monolith silhouette catching the light. |
| 6 | `arrival`      | `{CDN}/visionaries/arrival.jpg`        | A lone **astronaut** at a cave mouth looking out over an alien misty range as a **giant planet** rises; cool blue, starfield. |
| 7 | `spark`        | `{CDN}/visionaries/spark.jpg`          | Two ethereal **hands reaching** toward each other in cosmic light (Creation‑of‑Adam echo); blue‑and‑gold nebula. |
| 8 | `eclipse`      | `{CDN}/visionaries/eclipse.jpg`        | A lone **tree** on a rocky peak silhouetted against a glowing **orange ring/eclipse**; brooding sunset clouds. |
| 9 | `pilgrim`      | `{CDN}/visionaries/pilgrim.jpg`        | A robed **pilgrim** on a path through **pink‑flowered hills** above a sea of clouds between rock spires; teal sky. |

> Each image is used **twice**: full‑bleed as the backdrop (its `bgFocus`) and cropped small inside its glass disc (its `thumbFocus` + `thumbScale`). Provide the same single asset for both.

---

## 17. Data model — the 9 records (single source of truth)

The ring renders these in array order, wrapping infinitely; index 0 is the focal on load. `bgFocus` = backdrop `object-position`; `thumbFocus`/`thumbScale` frame the disc thumbnail; `accent` = a soft glow colour sampled from the scene; `tone` = thumbnail wash (`paint` | `photo` | `ink`).

```jsonc
[
  { "title":"The Emerald Gate", "caption":"A door in the wild",        "image":"emerald-gate", "bgFocus":"50% 50%", "thumbFocus":"50% 46%", "thumbScale":1.35, "tone":"paint", "accent":"#9bcf6a" },
  { "title":"The Mirror",       "caption":"Where the hills look back",  "image":"mirror",       "bgFocus":"50% 50%", "thumbFocus":"50% 44%", "thumbScale":1.50, "tone":"paint", "accent":"#a9b6a0" },
  { "title":"The Crossing",     "caption":"A bridge between worlds",    "image":"crossing",     "bgFocus":"50% 50%", "thumbFocus":"50% 50%", "thumbScale":1.40, "tone":"paint", "accent":"#cdbf86" },
  { "title":"The Threshold",    "caption":"Climb, and the night opens", "image":"threshold",    "bgFocus":"50% 50%", "thumbFocus":"60% 46%", "thumbScale":1.40, "tone":"paint", "accent":"#e0903a" },
  { "title":"The Awakening",    "caption":"Dawn over the deep",         "image":"awakening",    "bgFocus":"50% 50%", "thumbFocus":"50% 46%", "thumbScale":1.30, "tone":"paint", "accent":"#d98a7a" },
  { "title":"The Arrival",      "caption":"A new world rises",          "image":"arrival",      "bgFocus":"50% 45%", "thumbFocus":"48% 44%", "thumbScale":1.25, "tone":"paint", "accent":"#7fa6cf" },
  { "title":"The Spark",        "caption":"Almost touching",           "image":"spark",        "bgFocus":"50% 50%", "thumbFocus":"50% 52%", "thumbScale":1.35, "tone":"paint", "accent":"#cda86a" },
  { "title":"The Eclipse",      "caption":"Light behind the living",   "image":"eclipse",      "bgFocus":"50% 50%", "thumbFocus":"50% 48%", "thumbScale":1.40, "tone":"paint", "accent":"#e8702f" },
  { "title":"The Pilgrim",      "caption":"Above the clouds, alone",   "image":"pilgrim",      "bgFocus":"50% 50%", "thumbFocus":"50% 54%", "thumbScale":1.50, "tone":"paint", "accent":"#cf9ab0" }
]
```

---

## 18. Tuning constants (one block, all the magic numbers)

```
N            = 9
INITIAL      = 0            // focal scene on load

// ring + sizing
RING_R       = 0.34         // ·min(W,H)   (phone 0.38)
RING_CY      = 0.055        // ·H          (push below centre, clears chrome)
CARD_FACTOR  = 0.17         // ·min(W,H)   (phone 0.21), clamped [60,184]
BASE_SCALE   = 0.86         // ordinary disc
TOP_EMPHASIS = 0.32         // extra for the focal disc → 1.18×
LIFT         = 7            // px the focal disc rises

// glass
FACE_INSET   = 16           // %  thumbnail inset → clear glass ring
BEZEL_RATIO  = 0.16         // refractive band (·box)
THICKNESS    = 34           // glass depth
CHROMA       = 2.2          // chromatic spread
WOBBLE       = 0.38         // liquid breathing amplitude (3 layered sines)

// motion
ENTER_BG_DUR = 2.0 s  (power3.out)
ENTER_DUR    = 2.7 s  (power4.out)   // ring wind‑up
ENTER_SPIN   = 2.4 rad               // pre‑rotation that unwinds
STEP_DUR     = 1.0 s  (easeInOutExpo)
KENBURNS     = 34 s

// interaction
DRAG_PER_STEP   = 260 px    // desktop; phones use clamp(width*0.38, 130, 260)
WHEEL_THRESHOLD = 88
WHEEL_GAP       = 140 ms
AUTO_INTERVAL   = 3600 ms
USER_IDLE       = 4400 ms
```

---

## 19. Acceptance checklist (pixel‑perfect)

- [ ] Nine discs sit on a **true circle** (sized off `min(W,H)`), centre nudged down by `0.055·H`; the focal disc is at 12 o’clock and is **1.18×** the others, lifted 7px.
- [ ] Backdrop is the focal scene, `cover`, dimmed to `brightness .6`, with a slow Ken Burns; it **cross‑fades** (not cuts) on every rotation.
- [ ] Discs are **real refractive glass** on Chromium (the rim lenses + chroma‑fringes the scene behind, breathing on a 3‑sine wobble) and a clean frosted glass on Safari/Firefox.
- [ ] Non‑focal discs are drained toward monochrome + dimmer; the focal one is full colour.
- [ ] Centred title is **Poppins 500**, wraps to fit between the side discs; caption is tracked uppercase; both **replay** on every scene change.
- [ ] **Entrance:** ring winds up ~137° from a contracted centre and blooms outward (2.7s `power4.out`), discs stagger top‑first, backdrop blooms (2.0s) — all settled ≈ 3.05s.
- [ ] **Switch:** exactly one slot per input, `easeInOutExpo`, 1.0s. **Trackpad = one card per flick** (momentum tail swallowed). Drag projects + snaps. Tapping a disc brings it to the top. Auto‑rotate dwells ~3.6s, pauses on input, resumes after ~4.4s idle.
- [ ] **Phones (≤640px):** bigger discs (0.21), roomier ring (0.38), chevrons hidden, title/caption tightened; the ring stays a circle. **Finger‑drag rotates the ring** — one comfortable thumb‑swipe (~⅓ screen) = exactly one card, both directions.
- [ ] **Reduced motion:** instant settled state, no wobble/Ken Burns/auto‑rotate.
- [ ] No saturated UI colour, no serif, no gradient text — accents only as soft art‑sampled glows.
```
