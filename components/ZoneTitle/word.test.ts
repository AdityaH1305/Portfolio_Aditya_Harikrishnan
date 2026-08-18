/* ══════════════════════════════════════════════════════
   PROJECTS — what has to be true

   A voxel word passes every reasonable assertion and can
   still be illegible, so these cover the things that are
   checkable and the stills cover the rest. Nothing here is
   watchable in the dev environment: the browser pane never
   composites, so rAF is paused and the canvas never draws.
   ══════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { NEAR } from "../SignalGate/cubes.ts";
import {
    GLYPH_COLS,
    LETTER_GAP,
    WORD,
    WORD_CELLS,
    WORD_COLS,
    WORD_ROWS,
    WORD_Z,
    anchorWorld,
    atlasSources,
    cellSizeFor,
    disperseAt,
    emergeAt,
    localProgress,
    screenOf,
    screenRadius,
    seedPose,
    settle,
    slotPose,
    sourceForCell,
    wordBounds,
} from "./word.ts";

const VIEWPORTS = [
    { w: 1440, h: 900, mode: "desktop" as const },
    { w: 1280, h: 720, mode: "desktop" as const },
    { w: 1024, h: 768, mode: "desktop" as const },
];

const anchorAt = (w: number, h: number) =>
    anchorWorld(w * 0.4, h * 0.3, WORD_Z, w, h);

/* ══ The word ════════════════════════════════════════ */

test("THE CUBE COUNT IS THE BUDGET, AND IT IS BOUNDED", () => {
    /* This runs alongside the atlas rather than pausing it, which is a knowing
       exception to the one-canvas rule — so the count is the thing keeping it
       honest. At the A's 5×8 metrics the same word needs 165–190; the whole
       reason for a 3×5 face is to stay under a hundred. */
    assert.ok(
        WORD_CELLS.length <= 100,
        `${WORD_CELLS.length} cubes is past the budget`,
    );
    assert.ok(WORD_CELLS.length >= 60, "suspiciously few — is the art empty?");
});

test("every letter is present, non-empty and separated", () => {
    /* A missing glyph entry throws at module load, but an art block that is
       accidentally blank, or two letters run together, only shows up here. */
    for (let g = 0; g < WORD.length; g++) {
        const cells = WORD_CELLS.filter((c) => c.glyph === g);
        assert.ok(cells.length >= 5, `letter ${g} (${WORD[g]}) has ${cells.length} cells`);

        const originX = g * (GLYPH_COLS + LETTER_GAP);
        for (const c of cells) {
            assert.ok(
                c.cx >= originX && c.cx < originX + GLYPH_COLS,
                `letter ${g} spills into its neighbour's columns`,
            );
            assert.ok(c.cy >= 0 && c.cy < WORD_ROWS);
        }
    }

    // The gap columns are genuinely empty.
    for (let g = 0; g < WORD.length - 1; g++) {
        const gapX = g * (GLYPH_COLS + LETTER_GAP) + GLYPH_COLS;
        assert.ok(
            !WORD_CELLS.some((c) => c.cx === gapX),
            `the gap after letter ${g} is not empty`,
        );
    }
});

test("distinct letters actually differ", () => {
    /* P and R differ only in their bottom two rows at this resolution, and O
       and C only on the right edge. If the art were ever copy-pasted wrong the
       word would still tile perfectly and read as gibberish. */
    const shape = (g: number) =>
        WORD_CELLS.filter((c) => c.glyph === g)
            .map((c) => `${c.cx - g * (GLYPH_COLS + LETTER_GAP)},${c.cy}`)
            .sort()
            .join("|");

    // PROJECTS — every letter is distinct except none; all eight differ.
    const shapes = WORD.split("").map((_, g) => shape(g));
    for (let a = 0; a < shapes.length; a++) {
        for (let b = a + 1; b < shapes.length; b++) {
            if (WORD[a] === WORD[b]) continue;
            assert.notEqual(shapes[a], shapes[b], `${WORD[a]} and ${WORD[b]} are identical`);
        }
    }
});

/* ══ Placement ═══════════════════════════════════════ */

test("the word is solved from WIDTH, and fits", () => {
    /* `glyph.ts` solves its pitch from height, which is right for one
       5-column glyph and puts a 31-column word about six viewports across.
       This is the assertion that would have caught that. */
    for (const { w, h } of VIEWPORTS) {
        const poses = WORD_CELLS.map((_, i) => slotPose(i, anchorAt(w, h), w, h));
        const b = wordBounds(poses, w, h);
        assert.ok(b.w > w * 0.2, `word only ${Math.round(b.w)}px wide at ${w}`);
        assert.ok(b.w < w * 0.55, `word ${Math.round(b.w)}px wide at ${w} — too big`);
        assert.ok(b.h > 0 && b.h < h * 0.35);
    }
});

test("the cubes are small enough to read as fragments, and big enough to see", () => {
    for (const { w, h } of VIEWPORTS) {
        const r = screenRadius(slotPose(0, anchorAt(w, h), w, h), w, h);
        assert.ok(r >= 2.5, `cube half-width ${r.toFixed(1)}px — invisible`);
        assert.ok(r <= 14, `cube half-width ${r.toFixed(1)}px — these are meant to be tiny`);
    }
});

test("the anchor lands the word where it was asked to", () => {
    for (const { w, h } of VIEWPORTS) {
        const world = anchorWorld(w * 0.4, h * 0.3, WORD_Z, w, h);
        const back = screenOf({ ...world, z: WORD_Z, rx: 0, ry: 0, size: 0.1 }, w, h);
        assert.ok(Math.abs(back.x - w * 0.4) < 1e-6);
        assert.ok(Math.abs(back.y - h * 0.3) < 1e-6);
    }
});

/* ══ Emerging and dispersing ═════════════════════════ */

test("EVERY CUBE LANDS EXACTLY ON ITS SLOT", () => {
    /* This is type. A cube that lands a pixel or two out does not read as a
       flourish, it reads as a badly kerned font. */
    const { w, h } = VIEWPORTS[0];
    const sources = atlasSources(w, h, "desktop");
    WORD_CELLS.forEach((_, i) => {
        const slot = slotPose(i, anchorAt(w, h), w, h);
        const src = sources[sourceForCell(i, sources.length)];
        const end = emergeAt(seedPose(src, slot, w, h), slot, 1);
        assert.ok(Math.abs(end.pose.x - slot.x) < 1e-9, "x");
        assert.ok(Math.abs(end.pose.y - slot.y) < 1e-9, "y");
        assert.ok(Math.abs(end.pose.z - slot.z) < 1e-9, "z");
        assert.ok(Math.abs(end.pose.size - slot.size) < 1e-9, "size");
        assert.equal(end.alpha, 1);
    });
});

test("cubes start inside the atlas, small and invisible", () => {
    const { w, h } = VIEWPORTS[0];
    const sources = atlasSources(w, h, "desktop");
    const slot = slotPose(0, anchorAt(w, h), w, h);
    const start = emergeAt(seedPose(sources[0], slot, w, h), slot, 0);
    assert.equal(start.alpha, 0);
    assert.ok(start.pose.size < slot.size * 0.3);
    // And at the source, not near it.
    const s = screenOf(start.pose, w, h);
    assert.ok(Math.abs(s.x - sources[0].x) < 1, `started at ${s.x}, wanted ${sources[0].x}`);
    assert.ok(Math.abs(s.y - sources[0].y) < 1);
});

test("NOTHING CROSSES THE CAMERA OR LOOMS, EITHER WAY", () => {
    const { w, h } = VIEWPORTS[0];
    const sources = atlasSources(w, h, "desktop");
    const ceiling = cellSizeFor(w, h) / (WORD_Z - 1);

    WORD_CELLS.forEach((_, i) => {
        const slot = slotPose(i, anchorAt(w, h), w, h);
        const src = sources[sourceForCell(i, sources.length)];
        for (let u = 0; u <= 1.0001; u += 0.02) {
            const seed = seedPose(src, slot, w, h);
            for (const d of [emergeAt(seed, slot, u), disperseAt(slot, seed, u)]) {
                assert.ok(d.pose.z >= NEAR * 0.9 - 1e-9);
                assert.ok(d.pose.size / d.pose.z <= ceiling);
                assert.ok(Number.isFinite(d.pose.x) && Number.isFinite(d.pose.y));
                assert.ok(d.alpha >= 0 && d.alpha <= 1);
            }
        }
    });
});

test("THE WORD GOES BACK WHERE IT CAME FROM", () => {
    /* Mirrored on purpose: they came out of the diagram and they return to it.
       Anything else and the title simply stops existing, which is exactly what
       the entrance's fragments used to do before there was somewhere to go. */
    const { w, h } = VIEWPORTS[0];
    const sources = atlasSources(w, h, "desktop");

    WORD_CELLS.forEach((_, i) => {
        const slot = slotPose(i, anchorAt(w, h), w, h);
        const target = sources[sourceForCell(i, sources.length)];
        const seed = seedPose(target, slot, w, h);

        assert.equal(disperseAt(slot, seed, 1).alpha, 0);

        let prevD = Infinity;
        let prevA = Infinity;
        for (let p = 0; p <= 1.0001; p += 0.02) {
            const d = disperseAt(slot, seed, p);
            const s = screenOf(d.pose, w, h);
            const dist = Math.hypot(s.x - target.x, s.y - target.y);
            assert.ok(dist <= prevD + 1e-6, `cube ${i} backtracked at p=${p}`);
            assert.ok(d.alpha <= prevA + 1e-9, "alpha must never climb back");
            prevD = dist;
            prevA = d.alpha;
        }
    });
});

test("the atlas sources are the atlas's own, and on screen", () => {
    for (const { w, h, mode } of VIEWPORTS) {
        const sources = atlasSources(w, h, mode);
        assert.ok(sources.length >= 2);
        for (const s of sources) {
            assert.ok(s.x > 0 && s.x < w, `source x ${s.x} off screen at ${w}`);
            assert.ok(s.y > 0 && s.y < h, `source y ${s.y} off screen at ${h}`);
        }
        const used = new Set(WORD_CELLS.map((_, i) => sourceForCell(i, sources.length)));
        assert.equal(used.size, sources.length, "every source must feed some cube");
    }
});

/* ══ The stagger ═════════════════════════════════════ */

test("the word builds left to right and still finishes", () => {
    /* Eight letters arriving on one frame is a title that pops rather than one
       that is built. But the last letter must still reach 1 by the end, or the
       word is permanently missing its S. */
    assert.equal(localProgress(1, 0), 1);
    assert.equal(localProgress(1, WORD.length - 1), 1);
    assert.equal(localProgress(0, 0), 0);

    // The first letter is always at least as far along as the last.
    for (let u = 0; u <= 1.0001; u += 0.02) {
        assert.ok(localProgress(u, 0) >= localProgress(u, WORD.length - 1) - 1e-12);
    }

    // And there is a real lead — otherwise the stagger is decorative.
    assert.ok(localProgress(0.3, 0) - localProgress(0.3, WORD.length - 1) > 0.15);
});

/* ══ Pace ════════════════════════════════════════════ */

test("NO PART OF THE ASSEMBLY IS A BURST", () => {
    /* This is the assertion the "it forms too fast" report turned into.

       The complaint was never really about the scroll distance. A cubic
       ease-in-out — which is what this used, and what the rest of the site
       uses for its own good reasons — reaches THREE TIMES its average slope at
       the midpoint. A letter therefore idles through most of its window and
       then crosses the whole gap in a short burst, and stretching the window
       only stretches the idling. Smoothstep peaks at 1.5x, so the fastest
       instant is half as fast over the same travel.

       Measured as peak per-step distance against the mean, which is exactly
       the ratio that matters and is invisible in the constant itself. */
    const { w, h } = VIEWPORTS[0];
    const sources = atlasSources(w, h, "desktop");
    const STEPS = 400;

    WORD_CELLS.forEach((_, i) => {
        const slot = slotPose(i, anchorAt(w, h), w, h);
        const seed = seedPose(sources[sourceForCell(i, sources.length)], slot, w, h);

        for (const move of [
            (u: number) => emergeAt(seed, slot, u).pose,
            (u: number) => disperseAt(slot, seed, u).pose,
        ]) {
            let prev = screenOf(move(0), w, h);
            let peak = 0;
            let total = 0;
            for (let k = 1; k <= STEPS; k++) {
                const at = screenOf(move(k / STEPS), w, h);
                const d = Math.hypot(at.x - prev.x, at.y - prev.y);
                if (d > peak) peak = d;
                total += d;
                prev = at;
            }
            const mean = total / STEPS;
            if (mean < 1e-9) continue; // a cube that barely travels
            assert.ok(
                peak / mean <= 1.6,
                `cube ${i} peaked at ${(peak / mean).toFixed(2)}x its average — that is a snap`,
            );
        }
    });
});

test("the curve still lands exactly on both ends", () => {
    /* Everything that asserts a cube arrives on its slot depends on this, so
       swapping the easing must not have moved either endpoint. */
    assert.equal(settle(0), 0);
    assert.equal(settle(1), 1);
    assert.equal(settle(-3), 0);
    assert.equal(settle(4), 1);

    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.005) {
        const v = settle(t);
        assert.ok(v >= prev - 1e-12, `not monotone at ${t}`);
        assert.ok(v >= 0 && v <= 1);
        prev = v;
    }
});
