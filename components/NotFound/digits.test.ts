/* ══════════════════════════════════════════════════════
   404 — the arithmetic

   Everything in `digits.ts` is decisions; `NotFoundCubes.tsx` is a canvas and
   a ticker. That split matters more here than anywhere else in the repo,
   because the bounce is a SIMULATION and none of it is watchable in the dev
   environment — the browser pane never composites, so rAF never runs and the
   ticker never fires.

   So these tests are not a safety net over a thing that was eyeballed. They
   are the only place most of this is ever verified at all.

   Run:
     node --experimental-strip-types --test components/NotFound/digits.test.ts
   ══════════════════════════════════════════════════════ */

import test from "node:test";
import assert from "node:assert/strict";

import {
    ASSEMBLE_MS,
    ASSEMBLE_STAGGER,
    ASSEMBLE_TOTAL,
    CORNER_LIFT,
    CORNER_MS,
    DIGIT_CELLS,
    DIGITS_Z,
    FADE_IN,
    FILL_BASE,
    FILL_NEAR,
    GLYPH_COLS,
    LETTER_GAP,
    MAX_DT,
    WORD,
    WORD_COLS,
    WORD_ROWS,
    alphaScale,
    anchorWorld,
    arriveAt,
    cellScreenRadius,
    cellSizeFor,
    cornerLift,
    initialBounce,
    inkHeight,
    inkWidth,
    localProgress,
    rescaleBounce,
    screenOf,
    screenRadius,
    seedScreen,
    settle,
    slotPose,
    speedFor,
    stepBounce,
    type Bounce,
} from "./digits.ts";
import { NEAR, nearness } from "../SignalGate/cubes.ts";
import { MAX_DT as FORCES_MAX_DT } from "../SignalGate/forces.ts";

const VIEWPORTS = [
    { w: 2560, h: 1440 },
    { w: 1440, h: 900 },
    { w: 1280, h: 720 },
    { w: 1024, h: 768 },
    { w: 812, h: 375 }, // landscape phone — the aspect-ratio guarantee
    { w: 375, h: 812 }, // portrait phone
    { w: 320, h: 568 }, // the floor
];

const shapeOf = (glyphIndex: number): string => {
    const originX = glyphIndex * (GLYPH_COLS + LETTER_GAP);
    const rows: string[] = [];
    for (let cy = 0; cy < WORD_ROWS; cy++) {
        let row = "";
        for (let cx = 0; cx < GLYPH_COLS; cx++) {
            row += DIGIT_CELLS.some(
                (c) => c.cx === originX + cx && c.cy === cy,
            )
                ? "#"
                : ".";
        }
        rows.push(row);
    }
    return rows.join("|");
};

/* ── The art ─────────────────────────────────────────── */

test("THE CUBE COUNT IS THE BUDGET, AND IT IS BOUNDED", () => {
    assert.equal(DIGIT_CELLS.length, 30);
    // Lower bound catches an empty or half-transcribed glyph map; upper bound
    // is what keeps a "let's move to 5x7" edit honest about what it costs.
    assert.ok(DIGIT_CELLS.length >= 24);
    assert.ok(DIGIT_CELLS.length <= 40);
    assert.equal(WORD_COLS, 11); // 3*3 + 2*1 — the gap columns count
});

test("every glyph stays in its own columns, and the gaps are empty", () => {
    for (let g = 0; g < WORD.length; g++) {
        const originX = g * (GLYPH_COLS + LETTER_GAP);
        const mine = DIGIT_CELLS.filter(
            (c) => c.cx >= originX && c.cx < originX + GLYPH_COLS,
        );
        assert.ok(mine.length >= 8, `glyph ${g} is nearly empty`);
        for (const c of mine) {
            assert.equal(c.glyph, g);
            assert.ok(c.cy >= 0 && c.cy < WORD_ROWS);
        }
    }

    // The two separator columns carry nothing.
    for (const gapX of [GLYPH_COLS, 2 * GLYPH_COLS + LETTER_GAP]) {
        assert.equal(
            DIGIT_CELLS.filter((c) => c.cx === gapX).length,
            0,
            `column ${gapX} should be a gap`,
        );
    }
});

test("the two 4s are identical and the 0 differs from both", () => {
    assert.equal(shapeOf(0), shapeOf(2), "the two 4s must match exactly");
    assert.notEqual(shapeOf(0), shapeOf(1));
});

test("4 is ONE connected component", () => {
    /* `glyph.test.ts` learned this the hard way: the A's apex sat on the
       diagonal only, so the top bar was a separate floating object. A digit
       with a detached stroke reads as a rendering bug, not as a font. */
    const cells = DIGIT_CELLS.filter((c) => c.glyph === 0).map((c) => ({
        cx: c.cx,
        cy: c.cy,
    }));
    const key = (x: number, y: number) => `${x},${y}`;
    const all = new Set(cells.map((c) => key(c.cx, c.cy)));
    const seen = new Set<string>([key(cells[0].cx, cells[0].cy)]);
    const queue = [cells[0]];
    while (queue.length) {
        const c = queue.shift()!;
        for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            const k = key(c.cx + dx, c.cy + dy);
            if (all.has(k) && !seen.has(k)) {
                seen.add(k);
                queue.push({ cx: c.cx + dx, cy: c.cy + dy });
            }
        }
    }
    assert.equal(seen.size, cells.length, "4 has a detached stroke");
});

test("0 IS A RING, AND IT IS DELIBERATELY IDENTICAL TO A CAPITAL O", () => {
    /* Not a defect and not an oversight. Three columns leaves one interior
       column, so a slash or a dot has nowhere to go, and filling the centre
       turns row 2 into `###` and the glyph reads as 8.

       Asserted as a literal so that a later "fix" to the art announces what
       it is undoing. It is also precisely why these digits are NOT in
       `word.ts`'s GLYPHS: sharing one map would put `0` and `O` in it with
       the same shape, and `word.test.ts` asserts distinct characters differ. */
    assert.equal(shapeOf(1), "###|#.#|#.#|#.#|###");

    const zero = DIGIT_CELLS.filter((c) => c.glyph === 1);
    assert.equal(zero.length, 12, "a filled 0 would be 15");
    const originX = GLYPH_COLS + LETTER_GAP;
    for (const cy of [1, 2, 3]) {
        assert.ok(
            !zero.some((c) => c.cx === originX + 1 && c.cy === cy),
            "the counter must stay open",
        );
    }
});

/* ── Size ────────────────────────────────────────────── */

test("the word fits on every viewport, and is never invisible", () => {
    for (const { w, h } of VIEWPORTS) {
        const iw = inkWidth(w, h);
        const ih = inkHeight(w, h);
        assert.ok(iw <= w * 0.55, `${w}x${h}: too wide (${iw.toFixed(0)})`);
        assert.ok(ih <= h * 0.45, `${w}x${h}: too tall (${ih.toFixed(0)})`);
        assert.ok(
            iw >= 0.25 * Math.min(w, h),
            `${w}x${h}: too small (${iw.toFixed(0)})`,
        );
        // Both axes must leave room to travel, or the bounce degenerates.
        assert.ok(w - iw > 100, `${w}x${h}: no horizontal travel`);
        assert.ok(h - ih > 100, `${w}x${h}: no vertical travel`);
    }
});

test("THE REPORTED BOX IS THE INK, NOT THE GRID", () => {
    /* This box IS the collision box. Report the grid span instead and the
       word clips the frame by one cube radius on every single bounce. */
    for (const { w, h } of VIEWPORTS) {
        const anchor = anchorWorld(w / 2, h / 2, DIGITS_Z, w, h);
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (let i = 0; i < DIGIT_CELLS.length; i++) {
            const p = slotPose(i, anchor);
            const s = screenOf(p, w, h);
            const r = screenRadius(p, w, h);
            minX = Math.min(minX, s.x - r);
            maxX = Math.max(maxX, s.x + r);
            minY = Math.min(minY, s.y - r);
            maxY = Math.max(maxY, s.y + r);
        }
        assert.ok(Math.abs(maxX - minX - inkWidth(w, h)) < 0.01);
        assert.ok(Math.abs(maxY - minY - inkHeight(w, h)) < 0.01);
    }
});

test("cube size stays in a sane band", () => {
    for (const { w, h } of VIEWPORTS) {
        const r = cellScreenRadius(w, h);
        assert.ok(r >= 5 && r <= 30, `${w}x${h}: radius ${r.toFixed(1)}`);
    }
});

test("SIZE IS INDEPENDENT OF DEPTH, which is what licenses tuning it", () => {
    /* `z` cancels out of the whole chain. Non-obvious, invisible in the
       source, and the reason DIGITS_Z can be moved for brightness without
       re-solving the layout. */
    for (const { w, h } of VIEWPORTS) {
        const base = cellScreenRadius(w, h, 3.0);
        for (const z of [4.6, 6.0]) {
            assert.ok(Math.abs(cellScreenRadius(w, h, z) - base) < 1e-9);
        }
    }
});

test("the anchor round-trips", () => {
    for (const { w, h } of VIEWPORTS) {
        for (const [sx, sy] of [
            [w / 2, h / 2],
            [120, 90],
            [w - 40, h - 30],
        ]) {
            const a = anchorWorld(sx, sy, DIGITS_Z, w, h);
            const back = screenOf(
                { x: a.x, y: a.y, z: DIGITS_Z, rx: 0, ry: 0, size: 0.1 },
                w,
                h,
            );
            assert.ok(Math.abs(back.x - sx) < 1e-6);
            assert.ok(Math.abs(back.y - sy) < 1e-6);
        }
    }
});

/* ── The arrival ─────────────────────────────────────── */

test("EVERY CUBE LANDS EXACTLY ON ITS SLOT", () => {
    /* Type that lands a pixel out reads as bad kerning, not as a flourish. */
    for (const { w, h } of VIEWPORTS) {
        const anchor = anchorWorld(w / 2, h / 2, DIGITS_Z, w, h);
        for (let i = 0; i < DIGIT_CELLS.length; i++) {
            const slot = slotPose(i, anchor);
            const d = arriveAt(i, slot, seedScreen(i, w, h), 1, w, h);
            assert.ok(Math.abs(d.pose.x - slot.x) < 1e-9);
            assert.ok(Math.abs(d.pose.y - slot.y) < 1e-9);
            assert.ok(Math.abs(d.pose.z - slot.z) < 1e-9);
            assert.ok(Math.abs(d.pose.size - slot.size) < 1e-9);
            assert.equal(d.alpha, 1);
        }
    }
});

test("EVERY CUBE STARTS FULLY OFF SCREEN", () => {
    /* The aspect-ratio guarantee. A circle in raw pixels is nowhere near the
       top and bottom of a 16:9 frame; solving in normalised space is what
       makes this true at every angle and every shape of viewport. */
    for (const { w, h } of VIEWPORTS) {
        const anchor = anchorWorld(w / 2, h / 2, DIGITS_Z, w, h);
        for (let i = 0; i < DIGIT_CELLS.length; i++) {
            const slot = slotPose(i, anchor);
            const d = arriveAt(i, slot, seedScreen(i, w, h), 0, w, h);
            const s = screenOf(d.pose, w, h);
            const r = screenRadius(d.pose, w, h);
            assert.ok(
                s.x + r < 0 || s.x - r > w || s.y + r < 0 || s.y - r > h,
                `${w}x${h} cube ${i} starts on screen`,
            );
        }
    }
});

test("a cube is solid before it is on screen", () => {
    /* At FADE_IN 0.15 `arrival.ts` had a block at 94% opacity and already
       inside the frame — "floats in from outside" became "materialises just
       inside". Same assertion, ported. */
    for (const { w, h } of VIEWPORTS) {
        const anchor = anchorWorld(w / 2, h / 2, DIGITS_Z, w, h);
        for (let i = 0; i < DIGIT_CELLS.length; i++) {
            const slot = slotPose(i, anchor);
            const seed = seedScreen(i, w, h);
            for (let u = 0; u <= 1.0001; u += 0.005) {
                const d = arriveAt(i, slot, seed, u, w, h);
                const s = screenOf(d.pose, w, h);
                const r = screenRadius(d.pose, w, h);
                const onScreen =
                    s.x + r >= 0 && s.x - r <= w && s.y + r >= 0 && s.y - r <= h;
                if (onScreen) {
                    assert.equal(
                        d.alpha,
                        1,
                        `${w}x${h} cube ${i} enters at alpha ${d.alpha}`,
                    );
                    break;
                }
            }
        }
    }
    assert.ok(FADE_IN <= 0.1);
});

test("nothing crosses the camera or looms", () => {
    for (const { w, h } of VIEWPORTS) {
        const anchor = anchorWorld(w / 2, h / 2, DIGITS_Z, w, h);
        for (let i = 0; i < DIGIT_CELLS.length; i++) {
            const slot = slotPose(i, anchor);
            const seed = seedScreen(i, w, h);
            for (let u = 0; u <= 1.0001; u += 0.02) {
                const d = arriveAt(i, slot, seed, u, w, h);
                assert.ok(d.pose.z >= NEAR * 0.9 - 1e-9);
                assert.ok(
                    d.pose.size / d.pose.z <=
                        cellSizeFor() / (DIGITS_Z - 1) + 1e-9,
                );
                assert.ok(Number.isFinite(d.pose.x));
                assert.ok(Number.isFinite(d.pose.y));
                assert.ok(d.alpha >= 0 && d.alpha <= 1);
            }
        }
    }
});

test("NO PART OF THE ASSEMBLY IS A BURST", () => {
    /* Peak step over mean step. A cubic ease scores ~3.0 and reads as a snap;
       smoothstep scores 1.5. `word.test.ts` measured both. */
    const { w, h } = { w: 1440, h: 900 };
    const anchor = anchorWorld(w / 2, h / 2, DIGITS_Z, w, h);
    for (let i = 0; i < DIGIT_CELLS.length; i++) {
        const slot = slotPose(i, anchor);
        const seed = seedScreen(i, w, h);
        let peak = 0;
        let total = 0;
        const N = 400;
        let prev = screenOf(arriveAt(i, slot, seed, 0, w, h).pose, w, h);
        for (let k = 1; k <= N; k++) {
            const s = screenOf(
                arriveAt(i, slot, seed, k / N, w, h).pose,
                w,
                h,
            );
            const step = Math.hypot(s.x - prev.x, s.y - prev.y);
            peak = Math.max(peak, step);
            total += step;
            prev = s;
        }
        assert.ok(peak / (total / N) <= 1.6, `cube ${i} bursts`);
    }
});

test("settle lands on both ends and matches word.ts's curve", () => {
    assert.equal(settle(0), 0);
    assert.equal(settle(1), 1);
    assert.equal(settle(-5), 0);
    assert.equal(settle(5), 1);
    for (let t = 0; t <= 1.0001; t += 0.01) {
        // The "written twice" pin — same smoothstep as ZoneTitle's.
        assert.ok(Math.abs(settle(t) - t * t * (3 - 2 * t)) < 1e-12);
    }
});

test("the stagger sweeps and still completes", () => {
    assert.equal(localProgress(1, 0), 1);
    assert.equal(localProgress(1, WORD_COLS - 1), 1);
    assert.equal(localProgress(0, 0), 0);
    // A real lead: the first column is meaningfully ahead of the last.
    assert.ok(localProgress(0.3, 0) - localProgress(0.3, WORD_COLS - 1) > 0.15);
    assert.equal(ASSEMBLE_TOTAL, 200 + ASSEMBLE_STAGGER + ASSEMBLE_MS);
});

/* ── The bounce ──────────────────────────────────────── */

const runBounce = (
    w: number,
    h: number,
    dtOf: (i: number) => number,
    steps: number,
) => {
    let s = initialBounce(w, h);
    let now = 0;
    const hw = inkWidth(w, h) / 2;
    const hh = inkHeight(w, h) / 2;
    let xBounces = 0;
    let yBounces = 0;
    const quadrants = new Set<string>();
    for (let i = 0; i < steps; i++) {
        const prev = s;
        const dt = dtOf(i);
        now += dt * 1000;
        s = stepBounce(s, dt, w, h, now);

        assert.ok(s.x - hw >= -1e-9, `escaped left at ${i}`);
        assert.ok(s.x + hw <= w + 1e-9, `escaped right at ${i}`);
        assert.ok(s.y - hh >= -1e-9, `escaped top at ${i}`);
        assert.ok(s.y + hh <= h + 1e-9, `escaped bottom at ${i}`);
        assert.ok(
            Math.abs(Math.hypot(s.dx, s.dy) - 1) < 1e-12,
            `speed drifted at ${i}`,
        );

        if (s.dx !== prev.dx) xBounces++;
        if (s.dy !== prev.dy) yBounces++;
        quadrants.add(`${s.x < w / 2 ? 0 : 1}${s.y < h / 2 ? 0 : 1}`);
    }
    return { s, xBounces, yBounces, quadrants };
};

test("THE BOUNCE NEVER ESCAPES, UNDER THREE DT REGIMES", () => {
    /* 120 simulated seconds each. The jittered regime is the one that matters
       — an uneven frame budget is what a real machine hands you, and it is
       where mirror-versus-clamp bugs live. */
    const jitter = [0.004, 1 / 60, 0.033, 0.05];
    for (const { w, h } of VIEWPORTS) {
        runBounce(w, h, () => 1 / 60, 7200);
        runBounce(w, h, () => MAX_DT, 2400);
        runBounce(w, h, (i) => jitter[i % jitter.length], 7200);
    }
});

test("the travel is a real DVD path, not a rail", () => {
    const r = runBounce(1440, 900, () => 1 / 60, 7200);
    assert.ok(r.xBounces >= 6, `only ${r.xBounces} x-bounces in 120s`);
    assert.ok(r.yBounces >= 5, `only ${r.yBounces} y-bounces in 120s`);
    assert.equal(r.quadrants.size, 4, "never visited all four quadrants");

    const s0 = initialBounce(1440, 900);
    assert.ok(Math.abs(s0.dx) > 0.2 && Math.abs(s0.dy) > 0.2);
});

test("DT CLAMPING SURVIVES A BACKGROUNDED TAB", () => {
    /* Proves the clamp is APPLIED, not merely defined. rAF hands back the
       whole time a hidden tab was away; at ~99px/s a 45-second dt is 4,455px
       of travel in one step. */
    const s = initialBounce(1440, 900);
    assert.deepEqual(
        stepBounce(s, 45, 1440, 900, 0),
        stepBounce(s, MAX_DT, 1440, 900, 0),
    );
    assert.equal(MAX_DT, FORCES_MAX_DT, "the repo has one dt clamp");
    assert.ok(MAX_DT <= 0.05);
});

test("reflection is IDEMPOTENT", () => {
    /* `Math.abs` rather than negation. If the same branch ever fires twice —
       a large dt, a resize, a float edge case — the word must not un-reflect
       itself into the wall and sit vibrating there. */
    const w = 1440,
        h = 900;
    const hw = inkWidth(w, h) / 2;
    let s: Bounce = {
        ...initialBounce(w, h),
        x: hw + 0.05,
        dx: -Math.abs(initialBounce(w, h).dx),
    };
    s = stepBounce(s, 1 / 60, w, h, 0);
    assert.ok(s.dx > 0, "did not reflect off the left wall");
    const again = stepBounce({ ...s, x: hw + 0.05 }, 1 / 60, w, h, 16);
    assert.ok(again.dx > 0, "reflected back INTO the wall");
});

test("a resize does not teleport or strand", () => {
    const seq: Array<[number, number]> = [
        [1440, 900],
        [375, 812],
        [1440, 300],
        [2560, 1440],
        [1440, 900],
    ];
    let s = initialBounce(1440, 900);
    let [w, h] = seq[0];
    for (let i = 0; i < 900; i++) s = stepBounce(s, 1 / 60, w, h, i * 16);

    for (let k = 1; k < seq.length; k++) {
        const [nw, nh] = seq[k];
        const oldSpanX = w - inkWidth(w, h);
        const fx = oldSpanX > 0 ? (s.x - inkWidth(w, h) / 2) / oldSpanX : 0.5;

        s = rescaleBounce(s, w, h, nw, nh);
        [w, h] = [nw, nh];

        const hw = inkWidth(w, h) / 2;
        const hh = inkHeight(w, h) / 2;
        assert.ok(s.x - hw >= -1e-9 && s.x + hw <= w + 1e-9);
        assert.ok(s.y - hh >= -1e-9 && s.y + hh <= h + 1e-9);

        const spanX = w - inkWidth(w, h);
        if (oldSpanX > 0 && spanX > 0) {
            assert.ok(Math.abs((s.x - hw) / spanX - fx) < 1e-9);
        }

        for (let i = 0; i < 600; i++) {
            s = stepBounce(s, 1 / 60, w, h, i * 16);
            assert.ok(s.x - hw >= -1e-9 && s.x + hw <= w + 1e-9);
            assert.ok(s.y - hh >= -1e-9 && s.y + hh <= h + 1e-9);
        }
    }
});

test("a degenerate viewport is survivable and keeps its heading", () => {
    /* A canvas can be handed a 1x1 box during a CSS transition or before the
       stylesheet applies. The word pins to centre and does not integrate that
       axis — it must NOT lose its direction, or it resumes sliding along one
       axis forever when the viewport comes back. */
    for (const [w, h] of [
        [1, 1],
        [100, 100],
    ]) {
        let s = rescaleBounce(initialBounce(1440, 900), 1440, 900, w, h);
        for (let i = 0; i < 600; i++) {
            s = stepBounce(s, 1 / 60, w, h, i * 16);
            for (const v of [s.x, s.y, s.dx, s.dy, s.cornerAt, s.edgeAt]) {
                assert.ok(Number.isFinite(v));
            }
            assert.ok(Math.abs(Math.hypot(s.dx, s.dy) - 1) < 1e-12);
        }
        const back = rescaleBounce(s, w, h, 1440, 900);
        assert.ok(Math.abs(Math.hypot(back.dx, back.dy) - 1) < 1e-12);
    }
});

/* ── The corner ──────────────────────────────────────── */

test("the corner lift is bounded and decays", () => {
    const s: Bounce = { ...initialBounce(1440, 900), cornerAt: 1000 };
    assert.equal(cornerLift(s, 1000), 1);
    assert.equal(cornerLift(s, 1000 + CORNER_MS), 0);
    assert.equal(cornerLift(s, 1000 + CORNER_MS * 2), 0);
    assert.equal(cornerLift(s, 999), 0);

    let prev = Infinity;
    for (let t = 0; t <= CORNER_MS; t += 10) {
        const v = cornerLift(s, 1000 + t);
        assert.ok(v >= 0 && v <= 1);
        assert.ok(v <= prev + 1e-12, "lift climbed");
        prev = v;
    }
    for (let l = 0; l <= 1.0001; l += 0.05) {
        assert.ok(alphaScale(l) <= 1 + CORNER_LIFT + 1e-12);
        assert.ok(alphaScale(l) >= 1);
    }
});

test("a corner is actually reachable", () => {
    /* The golden slope is what makes this true — an axis-aligned start never
       corners, and 45 degrees degenerates into a short repeating diagonal. */
    let hit = false;
    for (const { w, h } of VIEWPORTS) {
        let s = initialBounce(w, h);
        for (let i = 0; i < 36000 && !hit; i++) {
            const prev = s;
            s = stepBounce(s, 1 / 60, w, h, i * (1000 / 60));
            if (s.cornerAt !== prev.cornerAt) hit = true;
        }
        if (hit) break;
    }
    assert.ok(hit, "no corner in 10 simulated minutes at any viewport");
});

/* ── The measurement that stops the render rule regressing ── */

test("THE COMPOSITED CONTRAST HOLDS", () => {
    /* THIS IS THE ONE THAT MATTERS. The natural thing to do in the canvas is
       copy ZoneTitle's draw loop wholesale, which fills all six faces — and
       at this pitch the far face projects at ~96.75% of the near one, so they
       overlap over ~94% of their area and six fills composite to 0.872
       coverage. That drives body text to 3.57:1: a WCAG failure that looks
       completely fine in review, because the page renders and only the
       reading is hard.

       Filling the NEAREST FACE ONLY is what makes the copy safe to sit
       anywhere, with no keep-out and no scrim. */
    const hex = (s: string) =>
        [1, 3, 5].map((i) => parseInt(s.substr(i, 2), 16));
    const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
            const n = v / 255;
            return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: number[], b: number[]) => {
        const [l1, l2] = [lum(a), lum(b)];
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const over = (fg: number[], alpha: number, bg: number[]) =>
        bg.map((c, i) => c * (1 - alpha) + fg[i] * alpha);

    const accent = [50, 130, 184]; // --accent-rgb
    const surface = hex("#1B262C"); // --surface-0
    const text = hex("#BBE1FA"); // --text-primary

    const oneFace =
        (FILL_BASE + nearness(DIGITS_Z) * FILL_NEAR) * alphaScale(1);
    assert.ok(
        ratio(text, over(accent, oneFace, surface)) >= 4.5,
        "one-face fill at the corner peak must clear AA",
    );

    // And the guard: six stacked fills would NOT clear it. If this ever
    // starts passing, the pitch changed and the render rule can be revisited.
    const six = 1 - Math.pow(1 - (FILL_BASE + nearness(DIGITS_Z) * FILL_NEAR), 6);
    assert.ok(
        ratio(text, over(accent, six, surface)) < 4.5,
        "six-face stacking now passes — re-derive the render rule",
    );
});

test("speed scales with the viewport", () => {
    assert.ok(speedFor(1440, 900) > speedFor(375, 812));
    assert.equal(speedFor(1440, 900), speedFor(900, 1440));
    assert.ok(speedFor(1440, 900) > 50 && speedFor(1440, 900) < 200);
});
