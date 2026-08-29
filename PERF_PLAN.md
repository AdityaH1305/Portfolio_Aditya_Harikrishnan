# Performance optimization plan

**Constraint:** nothing in this plan changes a visual, a copy string, a layout box, or a
timing curve. Every item is either work the page does that nobody can see, or the same
visible result produced by a cheaper mechanism. Where an item *could* drift a visual, it is
marked **[visual risk]** and paired with the exact check that proves it did not.

---

## 0. How this was measured

Production build (`BUILD_DIR=.next-verify npx next build`) served on `:3124`, viewport
1440x900. Numbers below are from that build, not `next dev`.

Caveat worth stating up front: the browser pane available in this session does not
composite, so `requestAnimationFrame` is paused there (this is the trap `CLAUDE.md`
documents under *Verifying in a browser*). That means **paint and composite costs could not
be timed directly** — no frame timeline, no layer memory. What *could* be measured is
everything that runs on the CPU regardless of compositing: style recalculation, layout,
geometry, DOM counts, resource weight. Those are the hard numbers cited. Anything about
paint or compositing below is a structural argument from the code and the geometry, is
labelled as such, and needs a real browser to confirm — §5 says how.

Baseline facts:

| | |
|---|---|
| Document height (home, 1440x900) | 18,288 px |
| `.zone-scroll` height | 11,700 px — **64% of the whole page** |
| DOM nodes (home) | 659 |
| Inherited custom properties on `:root` | 105 |
| JS transferred | 263 KB across 17 chunks |
| CSS transferred | 15 KB, 355 rules |
| Ringed elements (`.live-ring, .shell-bezel`) | 14 |

---

## 1. The transition into Projects

This is the reported symptom, and it is not one problem. There is an **863 px window** —
about eight wheel notches, `scrollY` 1344 → 2207 — where six independent systems all run at
once. Measured trigger positions:

```
scrollY  1037  ZoneTitle emerge begins        (.work-head, "top 90%")
scrollY  1344  zone-immersive class lands     (.zone-scroll, "top 85%")  --+
scrollY  2109  choreography timeline starts   (.zone-scroll, "top top")    | 1200ms
scrollY  2207  ZoneTitle disperse ends                                     | palette
scrollY 12909  zone ends                                                 --+ transition
```

Ranked by measured or estimated cost.

### 1.1 The palette transition forces a whole-document style recalculation every frame — ~30 ms per frame, for 1200 ms

The single biggest item, and it is measurable.

`app/globals.css:994` transitions four `@property`-registered, `inherits: true` custom
properties on `:root`:

```css
:root {
  transition-property: --surface-0, --surface-1, --surface-2, --surface-3;
  transition-duration: 1200ms;
}
```

Every element on the page inherits those four, so each interpolated frame invalidates the
entire tree. Measured, on the production build:

| Operation on `<html>` | Cost |
|---|---|
| Change one custom property, force style recalc | **33.8 ms** |
| Change one custom property, force style + layout | 32.3 ms |
| Toggle a class that changes nothing inherited, force layout | 0.65 ms |
| Force layout only, no invalidation | 0.66 ms |

Two controls confirm the mechanism rather than a measurement artefact:

- An **unregistered, entirely unused** custom property (`--zzz-unused`) on `<html>` costs
  the same 32 ms — so this is not about `@property`, it is about any custom-property write
  on the root invalidating 659 descendants.
- The same write on a **freshly created 2-node subtree** costs 0.91 ms. The cost scales with
  subtree size: roughly 50 µs per element, which is what 105 inherited custom properties per
  node buys you.

So: 1200 ms of transition at 60 Hz is ~72 style recalculations of ~30 ms each. The frame
budget is 16.7 ms. This alone cannot hold 60 fps, and it lands exactly as the reader arrives
at the section — while `ZoneTitle` is mid-draw and the choreography is about to start.

**Fix.** Keep the class swap (0.65 ms, once) and move the 1200 ms fade off the token onto
something composited. The four target colours are all darkenings of the base ramp toward
black, so the visual is reproducible as an overlay whose *opacity* transitions — one
composited layer, zero style recalc.

There is a correctness detail: the four surfaces darken by *different* amounts
(`#1B262C→#0E161B`, `#173346→#10222F`, `#13415F→#0F2E44`, `#0F4C75→#0D3A59`), so a single
uniform overlay is not colour-exact on the raised surfaces. Two options, in order of
preference:

1. **Keep the token swap instantaneous, and cover it with a crossfade.** Snap the four
   tokens at the boundary (one 0.65 ms recalc) and simultaneously run an overlay that fades
   the *old* palette out over 1200 ms. Colour-exact by construction, one composited layer.
   Needs a recording diff to confirm the seam is invisible. **[visual risk]**
2. **Transition the consuming properties instead of the tokens.** Only 63 elements on the
   page paint a background or a border. Adding `transition: background-color 1200ms` to
   those (via the existing `.zone-*` / `.section-*` / `.shell-bezel` classes rather than a
   universal selector) is exactly colour-accurate and invalidates 63 nodes rather than 659.
   More rules to write, but no visual risk at all and no new layer.

Whichever is chosen, **the same trap applies to `--gate-bg` / `--gate-key` / `--gate-text` /
`--gate-dim`** (`globals.css:115–139`), which are also `inherits: true`. They are set on
`.signal-gate`, not `:root`, so the invalidated subtree is the overlay rather than the
document — much smaller, and the gate is a full-screen overlay anyway. Worth confirming, not
worth changing.

**Expected gain:** removes ~2.2 seconds of accumulated main-thread style work from the
single most-complained-about 863 px of the page.

### 1.2 Eight conic-gradient rings repaint every frame; seven of them are invisible

`.zone-act` is `position: absolute; inset: 0` inside one sticky 100vh box, so all three acts
occupy the same rectangle for the entire zone. Measured — all eight `.zone-act-slide-frame
.shell-bezel` elements report the **identical** rect:

```
top 2320, 624 x 347   (x8)
```

`LiveRings.tsx:14` observes `.live-ring, .shell-bezel` with an `IntersectionObserver`, and
intersection does not care about `opacity: 0` or `visibility: hidden`. So all eight get
`.ring-live` and all eight run `ring-sweep` (`globals.css:753`) — a `conic-gradient` under a
two-layer `mask-composite: exclude`, which repaints its element every frame — for the whole
11,700 px of zone travel. Seven of the eight are painting something no one can see.

**Fix.** Add a visibility condition to the ring gate. Two independent halves, both cheap:

- CSS: extend the `.ring-live::before` rule (`globals.css:767`) so an element that is
  `visibility: hidden` cannot run. `.zone-act-slide` already gets `visibility: hidden` from
  the GSAP `autoAlpha` the choreography sets and from the SSR rescue at `globals.css:1409`,
  so the state is already on the element — nothing new needs to be tracked.
- JS: in `LiveRings.tsx`, drop `.ring-live` when the target's computed `visibility` is
  `hidden`. This needs to re-check when the choreography swaps a slide, which it does not
  currently observe, so it is the more invasive half.

The CSS half is the one that matters and carries no risk; the JS half is optional
belt-and-braces. **Do not** simply narrow `RINGED` — `CLAUDE.md` records that the first
version scanned only `.live-ring` and silently left every media mat static forever, and the
`RINGED` constant must stay equal to the `:is(.live-ring, .shell-bezel)` list.

**Expected gain:** 8 full-frame gradient repaints per frame → 1. Structural argument; verify
with paint flashing in a real browser.

### 1.3 The atlas runs at its most expensive stage through 64% of the page

`LivingArchitecture.tsx:139` records the decision to remove the zone from the atlas's pause
set, and the reasoning is sound — `#work` is `STAGES[2]`, the visual peak, and freezing the
diagram there was hiding it in the one section built to show it. But the consequence was not
priced: the atlas draws a full 1440x900 canvas at 60 fps for 11,700 px of scroll, at the
stage with **8 branches, 8 clusters, 8 concurrent signals and 2 conduits** — the densest
configuration in the file (`stages.ts:251–273`) — and does it at `opacity: 0.5`, so half of
what it draws is thrown away by the compositor.

Draw-call count per frame at stage 2, from `engine.ts`:

| Layer | Calls |
|---|---|
| Core segments, 2 passes | ~16 |
| Branch base + active strokes | 16 |
| Clusters, 2 passes x ~5 segments | **80** |
| Signals, glow + dot | 16 |
| Conduits | 2 |
| **Total** | **~130 stroke/fill calls, each with a fresh `rgba(...)` string** |

Three fixes, none of which change a pixel:

- **Batch the cluster segments.** `engine.ts:1348` opens a new path and sets a new
  `strokeStyle` for every segment, but within one cluster and one pass the alpha is constant
  except for the single fractional-density segment. Emitting one path per cluster per pass
  and stroking twice takes cluster draw calls from 80 to **16**, with identical output. This
  is the largest single win in the engine and is provable by pixel-diffing two frames.
- **Cache the `accent()` strings.** `config.ts:49` builds a template string per call, ~130
  times a frame, ~7,800 short-lived strings a second. Quantise alpha to 3 decimals and
  memoise in a `Map`. Zero visual difference at 8-bit output.
- **Check whether the governor is escalating, before touching it.**
  `engine.ts:updateGovernor` degrades on *average rAF interval*, which includes every other
  cost on the page. During the zone it will therefore see >24 ms, drop the atlas to 30 fps
  (level 1), then cut the signal budget (level 2), then **drop the backing store to 0.7 DPR
  (level 3)** — a visible resolution change caused by costs the atlas does not own. Once
  §1.1 and §1.2 land the governor may stop triggering on its own. If it still does, the
  honest fix is a partial stand-down (halve the target frame rate in the zone only), not the
  old full freeze that was correctly reverted. **[visual risk]**

### 1.4 `ZoneTitle` allocates ~1,100 objects per frame, in the same 863 px window

`ZoneTitle/ZoneTitle.tsx:144` runs for 1,170 px of scroll, overlapping §1.1 exactly. Per
frame, while active:

- `getComputedStyle(canvas).color` + a regex `.match()` + `.slice().map(Number)` — a forced
  style read and four allocations
- `slotEl.getBoundingClientRect()` — a forced layout read, interleaved with the atlas's own
  ticker work
- 80 cells → 80 `slotPose` + 80 `seedPose` + an 80-element array of objects
- per cell: `CUBE_VERTS.map(project)` (8 objects) + `CUBE_FACES.map` (6 objects) + a
  6-element sort — **~1,120 objects and 80 sorts per frame**, then one 80-element sort on top

All of it is recreated from scratch every frame and thrown away. Fixes, all output-identical:

- Hoist the colour read out of the loop. It only changes when the palette does; read it on a
  `zone-immersive` class change, or cache the parse against the raw string so the regex runs
  once instead of 60 times a second.
- Take the heading rect from the ScrollTrigger's own measurement instead of a fresh forced
  layout inside the ticker.
- Preallocate the pose array, the vertex array and the face array once and mutate in place.
  Cube vertex counts are fixed module constants, so this is a pure allocation removal.
- Replace the per-cube 6-element `sort` with a precomputed face order — for a cube, face
  depth ordering has only a handful of distinct outcomes and can be selected rather than
  sorted.

**[visual risk]** — `word.test.ts` already pins `wordScreenWidth` / `wordScreenHeight`
against `wordBounds`; extend it to assert the reused-buffer path returns poses identical to
the allocating one, so the refactor is proven headlessly.

### 1.5 Twenty-one composited layers appear at the boundary, at once

Measured: `will-change` goes from **6 elements outside the zone to 27 inside** — the 21 added
are `globals.css:1418`, promoting `.zone-act`, `.zone-act-head`, `.zone-act-media`,
`.zone-act-beat` (x3) and `.zone-act-ctas` on all three acts.

The comment above that rule is right that holding them permanently would be worse. But
creating 21 layers *in one frame*, at the same moment as §1.1's recalc storm, is a spike:
each `.zone-act` layer at 1440x900 is roughly 5 MB of texture, and two of the three acts are
`visibility: hidden` and will stay that way for thousands of pixels of scroll.

**Fix.** Promote per act rather than for the whole zone — add `will-change` when an act
becomes the active one and drop it when it leaves, driven by the choreography timeline that
already knows which act is on screen. Three layers live at a time instead of 21, and the
promotion for act two happens during act one's quiet stretch rather than at the boundary.

Cheaper interim: keep the rule but start it earlier than the palette's `top 85%`, so layer
creation and style recalc are not in the same frames.

### 1.6 Eight `backdrop-filter` elements sit inside the stacked acts

Measured: 11 elements page-wide have a non-`none` `backdrop-filter`, and **8 of them are the
`Expand` buttons** inside the case-study slides (`CaseStudyStage.tsx:358` and `:406`), all in
the same 624x347 box. They are `opacity-0` until hover, but `backdrop-filter` establishes a
backdrop root regardless.

**Fix.** Gate the filter on hover as well as the opacity — move `backdrop-blur-sm` behind the
`group-hover/media:` and `focus-visible:` variants that already control the opacity. The
button looks identical whenever it is actually visible.

---

## 2. Sitewide

### 2.1 The cursor is the most expensive thing on the page when nothing is happening

`Cursor.tsx` runs on `gsap.ticker` and does full work every single frame, forever, whether or
not the pointer moved or anything changed:

- A 97-point trigonometric path (`for (let i = 0; i <= 96; i++)` with two `Math.sin` calls
  each = **194 sin calls per frame**) plus two `stroke()` passes over it.
- A 320x320 radial-gradient div with **`mixBlendMode: "screen"`** (`Cursor.tsx:764`)
  translated every frame. Blend modes force a backdrop readback — this element cannot be
  cheaply composited, and it sits on top of a full-viewport canvas.
- A label chip with **`backdrop-blur-sm`** (`Cursor.tsx:799`) translated every frame, so its
  blur is re-sampled every frame it moves.
- `label.offsetWidth` — a forced layout read — every frame the label has text.

Fixes:

- **Early-out when nothing changed.** The component already computes `idle`; when `idle` has
  settled to 1, `press` and `radius` have converged, no impact or charge is live and the
  pointer has not moved, the canvas contents are identical to last frame. Skip the redraw and
  only write the two transforms. This is the big one: on a page being *read* rather than
  waved at, the cursor should cost nothing.
- Precompute `Math.cos(t)` / `Math.sin(t)` for the 97 fixed angles into a module-level table.
  The angles never change; only `rr` does. Removes ~194 transcendental calls per frame with
  bit-identical output.
- Cache `label.offsetWidth` per label text — it only changes when the text does.
- Drop the waveform resolution when `idle` is high — at flatline the path is a circle and 96
  segments is 96 segments of nothing. **[visual risk]**, small; check a still at `idle: 1`.
- **[visual risk]** Consider whether the `mix-blend-mode: screen` glow can be `screen`-free.
  On the site's near-black ground, `screen` over `--surface-0` is very close to `normal` with
  the same alpha — but this needs a pixel diff over a *bright* backdrop (a figure, a video
  frame) before it can be called equivalent. If it cannot be matched, leave it: it is one
  element, and the early-out above already stops it moving while the reader is still.

### 2.2 Trim the inherited custom-property map — speculative

§1.1 measured ~50 µs of style recalc per element, and the suspected driver is 105 inherited
custom properties on `:root`. Most are Tailwind v4 theme defaults the site never uses —
`--color-indigo-300`, `--color-indigo-400`, `--container-5xl`, `--text-2xl`,
`--leading-relaxed` and so on were all present in the computed root style.

Tailwind v4 emits its whole default theme unless namespaces are explicitly cleared. Adding
`--color-*: initial;` (and the same for the other unused namespaces) inside the existing
`@theme` block in `globals.css`, then re-declaring only what the site actually uses, shrinks
the map every node carries.

Honest caveat: **a direct experiment removing 7 of the 105 showed no improvement** (32.5 ms →
35.2 ms, i.e. noise). The relationship may not be linear, or the dominant cost may be
re-matching the 355 rules rather than copying the map. So this is speculative — worth trying
once §1.1 lands, worth abandoning immediately if a cut from 105 to ~40 does not move the
number. It has no visual risk either way.

### 2.3 `GaitPipeline` redraws a CPU-backed canvas on every scroll frame (`/work/gait` only)

`GaitPipeline.tsx:394` scrubs and calls `draw()` on every update. That draw is on a
`willReadFrequently: true` (deliberately CPU-backed, so the cursor probe is cheap) canvas and
does ~50 operations including `drawImage` from several offscreen canvases and text layout. It
also reads `canvas.clientWidth` per frame (forced layout) and calls `setStage()` per frame,
where the value only changes at stage boundaries.

Fixes, all invisible:

- Only call `setStage` when the rounded value actually changes.
- Cache `clientWidth`, invalidate on `resize` and `ScrollTrigger.refresh`.
- Skip `draw()` when `progress.current` has moved less than one pixel's worth of change.

Low priority — one route, and the reported symptom is not here.

### 2.4 Small, safe, no-risk items

- **Preconnect for the font host.** 89 KB of `woff2` on the critical path with no
  `preconnect`. One `<link>` in `app/layout.tsx`.
- **`fetchPriority` on the first case-study poster.** No image on the home page declares
  priority. The LCP is a text node so this is not urgent, but the first zone poster is
  fetched late and its `zone-act-poster` opacity transition is what a reader sees first.
- The `renderAccum` reset in `engine.ts` (`const dt = Math.min(this.renderAccum, 0.05);
  this.renderAccum = 0;`) discards time beyond the 0.05 clamp rather than carrying it. Not a
  performance issue — it means a long stall makes the atlas lose a little animation time
  rather than catch up. Noted, not proposed for change.

Confirmed already correct, no action: `SpaceInvadersGame` is behind `dynamic({ ssr: false })`;
the zone videos are `preload="none"` with per-slide gating; `AtmosphereParallax` runs one
ScrollTrigger and stands down inside the zone; `ScrollProgress` writes `scaleX`, never
`width`; the grain is static and the grid moves by transform.

---

## 3. Order of work

Each phase is independently shippable and independently verifiable. Do not batch them — the
whole point is to attribute the gain.

**Phase 1 — the boundary. This is the reported bug.**

1. §1.1 palette transition. Biggest measured win, and it is one CSS mechanism.
2. §1.2 ring gate. One CSS condition.
3. §1.6 backdrop-filter on hover. Three-line change.

Measure after Phase 1 before doing anything else. It is plausible that these three alone fix
the reported symptom, and if they do, §1.3's governor item should not be touched at all.

**Phase 2 — the per-frame budget inside the zone.**

4. §1.4 `ZoneTitle` allocations.
5. §1.3 atlas cluster batching and `accent()` memoisation.
6. §1.5 per-act layer promotion.

**Phase 3 — sitewide.**

7. §2.1 cursor idle early-out and trig table.
8. §2.4 the small items.

**Phase 4 — speculative, drop if it does not measure.**

9. §2.2 theme trim.
10. §2.3 `GaitPipeline`.

---

## 4. What is deliberately not being changed

Recording these so they are not "found" again later:

- **The atlas is not being frozen in the zone.** `CLAUDE.md` §8 and
  `LivingArchitecture.tsx:139` both record why that was reverted, and the reasoning holds.
  §1.3 proposes making the drawing cheaper, not making it stop.
- **`scrub: 1` on the zone timeline stays.** It is the damping that makes the composition
  feel weighted, and it is documented as deliberately different from the atlas's
  `scrub: true`.
- **The 400vh-per-act scroll length stays.** It is a pacing decision, not a performance one.
- **`RINGED` in `LiveRings.tsx` stays equal to the `:is()` list in `globals.css`.** The fix
  in §1.2 adds a condition; it does not narrow the selector.
- **`willReadFrequently` on the gait canvas stays.** It is there so the cursor probe does not
  force a GPU readback, which is the right trade for a canvas that only repaints on scrub.
- **Bundle size is not a problem.** 263 KB of JS across 17 chunks, with the atlas, the glyph,
  the zone title and the game all already code-split. No action.

---

## 5. Verification protocol

The measurements in §0 and §1 were taken without compositing, so **every paint- and
layer-related claim in this plan needs a real browser to confirm**. Before Phase 1:

1. Build to a separate directory and serve it — never build while a dev server is up:

```bash
BUILD_DIR=.next-verify npx next build && BUILD_DIR=.next-verify npx next start -p 3124
```

2. In Chrome DevTools, record a Performance trace scrolling `scrollY` 1000 → 2400 at a
   steady rate. Capture: total main-thread time, the "Recalculate Style" total, the
   "Paint" / "Composite Layers" total, and dropped-frame count. That is the baseline every
   phase is measured against.
3. Turn on **Paint flashing** and **Layer borders** in the Rendering panel and scroll the
   same range. The eight ring rectangles and the 21 promoted layers from §1.2 and §1.5
   should be directly visible; after the fix they should not be.
4. Re-run after each phase. Record the numbers in this file.

Regression gates that must pass unchanged after every phase:

```bash
npx tsc --noEmit && npx eslint . --quiet && npx next build
```

```bash
node --experimental-strip-types --test components/LivingArchitecture/blend.test.ts components/SkillOrbit/layout.test.ts components/SkillOrbit/flight.test.ts components/SignalGate/gate.test.ts components/SignalGate/preload.test.ts components/SignalGate/ecg.test.ts components/SignalGate/cubes.test.ts components/SignalGate/forces.test.ts components/SignalGate/finale.test.ts components/SignalGate/arrival.test.ts components/GlyphA/glyph.test.ts components/ZoneTitle/word.test.ts components/NotFound/digits.test.ts lib/handoff.test.ts lib/lenis.test.ts lib/entrance.test.ts
```

Visual gates, since "change nothing visible" is the whole constraint:

- Screenshot at `scrollY` 1344 (palette boundary), 2109 (choreography start), and the three
  act rest windows, before and after each phase. Pixel-diff. Anything non-zero outside the
  1200 ms transition window is a bug.
- The palette transition itself must be compared as a **recording**, not a still — §1.1's
  overlay approach is only correct if the crossfade lands on the same colours at the same
  times.
- Check `prefers-reduced-motion: reduce` and `scripting: none` after each phase. Several of
  these fixes touch rules inside the desktop `@media` block, and `CLAUDE.md` records that the
  stacked, always-visible layout is the default the server renders.

---

# 6. Second pass — what landed, and what the first pass got wrong

Phase 1–3 of the plan above shipped in `32811f1` and its follow-ups. This is the
round after it. Three findings first, because they change how the sections above
should be read.

## 6.1 Three corrections to the plan above

**§2.1's cursor early-out — "the big one" — was never implemented.** The trig table
(`Cursor.tsx:132`), the `arc()` fast path and the label-width cache all landed; the
early-out itself did not. The frame loop still cleared and fully redrew a 200x200
canvas, stroked the ring twice and wrote three transforms every frame, forever.
**Now done**: the canvas is a pure function of a handful of eased scalars, so once
they settle the frame is skipped entirely and only the transforms move — and those
are written only when they actually change.

The subtle part, which is worth keeping: the impact ring and the charge arc do not
converge, they stop being drawn at a *deadline*. The frame that crosses the
deadline is one where the canvas changes while every eased value is already
settled. Gate it out and the ring stays painted for the rest of the session.
`prevTimedLive` buys back exactly that one frame.

**§1.4's `ZoneTitle` work was half done.** The `getComputedStyle` and the
`getBoundingClientRect` were hoisted; the ~1,100 objects and 81 sorts per frame
were not. Now done via `orderedFaces` (below).

**§1.2's ring fix introduced a cost the plan never priced.** `LiveRings.tsx` gained
a `MutationObserver` on `.zone-scroll` with `attributeFilter: ["style"]`, and the
choreography writes inline style on every scrub frame — so it fired every frame and
rechecked every intersecting target. The plan's framing of this as "8 forced style
reads per frame" was **overstated**: the first `getComputedStyle` after GSAP writes
forces one recalculation and the other seven ride the clean tree. Still fixed —
the mutation records already say which elements moved, so only ringed targets that
are, or sit inside, a mutated element are rechecked. A rest window now costs
nothing.

## 6.2 The actual thesis of this round

**The first pass fixed each problem in the one file where it was measured, and left
the same pattern live in every sibling file it did not open.** Most of this round is
that carry-over, which is why it was low-risk: the fix already existed in the repo.

- **`orderedFaces` (`cubes.ts`).** Four draw loops each projected 8 vertices, built
  6 quad arrays and 6 face records and sorted them, **per cube per frame** —
  `ZoneTitle` (80 cubes, ~1,600 objects/frame), `GlyphA` (27), `SignalGate` (6 idle,
  27 through the burst), `NotFoundCubes`. One shared function now does the same
  arithmetic into buffers it reuses. `cubes.test.ts` asserts it is **vertex-for-vertex
  identical** to `renderCube`, so this is an allocation removal, not a
  re-implementation.

  `renderCube` stays, and its role changed: nothing draws with it any more, it is the
  reference implementation the fast path is checked against. That is a real job — a
  buffer-reusing projection with no independent statement of what it should produce
  is one nobody can check.

  The one thing the shared buffer cannot serve is a caller that wants every face of
  every cube at once. The entrance did exactly that in three places; each now sorts
  the **poses** and projects one cube at a time, which is the same order and the same
  pixels.

- **`GlyphA`'s per-frame `getComputedStyle(canvas).color`** — the identical read
  `ZoneTitle` had already been fixed for. Hoisted to `readAccent()`, refreshed where
  geometry already is.

## 6.3 `SkillOrbit` was never in scope, and had three live defects

Not mentioned anywhere in the plan above. It is also the section where a reader is
actively dragging things, so frame time is felt directly.

1. **`createRadialGradient` inside the draw loop** — once per anchor and once per
   focused body, so up to **33 gradient objects and 66 `addColorStop` calls a frame**.
   This is precisely what `engine.ts:242` in the atlas records having fixed. Now one
   unit-radius gradient, positioned with `translate`/`scale` and modulated with
   `globalAlpha`. Not an approximation: a stop of `accent@1` at `globalAlpha 0.28`
   *is* `accent@0.28`.

2. **THE LABELS WERE IN THE WRONG FONT, AND HAD BEEN ALL ALONG.**

   ```js
   c.font = `600 11px var(--font-jetbrains-mono), ui-monospace, monospace`;
   ```

   Canvas 2D parses `font` as a CSS shorthand with no element context, so `var()` is
   never substituted: **the assignment fails to parse and is discarded silently**,
   leaving the context on `10px sans-serif`. Both label styles were written this way,
   so every star label and every skill label on that canvas was rendering in the
   browser's default sans at the wrong size — in the one section whose whole visual
   language is instrument-like.

   Verified in Chrome rather than argued: after assigning that string, `ctx.font`
   still reads back `10px sans-serif`. The palette now carries the **resolved**
   stack (`"JetBrains Mono", "JetBrains Mono Fallback"`), which also picks up
   next/font's metric-matched fallback.

3. **Four off-palette colour literals** — `#e6ded2` in the starfield,
   `rgba(242,239,234,…)` on two label styles, `rgba(138,131,122,…)` on an unlit body.
   All warm greys left from the amber-on-near-black scheme this palette replaced.
   `CLAUDE.md` records the same class of bug being cleared out of the atlas
   ("thirteen hardcoded `rgba(34,211,238,…)` literals"); this file was simply not part
   of that pass. Every colour now reads from CSS.

## 6.4 Device tiering — `lib/deviceTier.ts`

There was **no device gating of any kind** anywhere in the tree. Every canvas ran at
full quality on a phone, and the only thing that ever stood down was the atlas's own
governor — which is reactive, so it costs a second of dropped frames to learn what a
cheap sniff of `navigator` says at mount.

The decision is pure (`tierFor`) and unit-tested, the same split `gate.ts`,
`blend.ts` and `flight.ts` use. **The trap the tests exist for**: Safari reports
neither `hardwareConcurrency` nor `deviceMemory`, and read naively that is a machine
with no cores — every Safari visitor demoted to the lowest tier on the site's best
hardware. Only a value that is *both present and low* counts as evidence.

`?tier=low` opens the low path on a desktop, because otherwise the mobile branch is
reachable only on a phone, which in practice means only once it is already broken.

**`dprCap` is an extra ceiling, never a replacement.** Every consumer reads
`Math.min(devicePixelRatio, <its own cap>, dprCap(tier))`, and `high` is deliberately
2 — the largest cap already in use — so on capable hardware this term can never bind
and nothing got softer than it was. Verified live: `data-tier="high"` leaves the ring
sweep running and the mobile island blurred, exactly as before.

CSS consumers get the verdict as `data-tier` on `<html>` (`DeviceTierFlag.tsx`), which
gates two things on `low`: the mobile nav island's permanent `backdrop-filter` (fixed
over a scrolling page, so re-sampled every frame it moves), and the ring sweep
(fourteen uncompositable full-box repaints a frame).

**One CSS trap worth keeping.** `backdrop-filter: none` in the override rule does
**not** work and fails silently: the element carries Tailwind's `backdrop-blur-md`,
which composes the property out of ten variables and emits both prefixed and
unprefixed forms, and a plain `backdrop-filter: none` written in `globals.css` came
out of the build as `-webkit-backdrop-filter: none` **alone** — the unprefixed
declaration dropped — so Chromium kept blurring. Only visible by reading the built
stylesheet; the source looked right. The fix is `--tw-backdrop-blur: ;`, which is how
Tailwind's own `backdrop-blur-none` does it.

## 6.5 Still open

Unchanged from the plan above, and worth not rediscovering:

- **§2.4's font `preconnect` is moot.** `next/font/google` self-hosts, so there is no
  third-party host to preconnect to. Not a task.
- §2.3 `GaitPipeline`, §2.2 theme trim, and `fetchPriority` on the first zone poster.
- `SideNav.tsx:73` still creates seven `IntersectionObserver`s where `LiveRings.tsx:97`
  shows the one-observer pattern.
- **No frame-rate measurement has been taken for any of this.** Every claim above is
  either a unit test, a live DOM/CSS check, or a structural argument from the code.
  The browser available while this was written does not composite, so rAF is paused
  and no frame timing is possible in it — the trap documented in `CLAUDE.md` under
  *Verifying in a browser*. §5's protocol still needs running in real Chrome.
