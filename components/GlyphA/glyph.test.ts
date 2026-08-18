/* ══════════════════════════════════════════════════════
   The A — what has to be true

   Every case here encodes a failure that is invisible in
   code review and unwatchable in this environment: the
   browser pane never composites, so rAF is paused and no
   animation on this page can be looked at. Simulating the
   arithmetic frame by frame is not a substitute for
   watching it — for these particular claims it is stronger.
   ══════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { NEAR } from "../SignalGate/cubes.ts";
import {
    AXIS_CELLS,
    FRAGMENT_COUNT,
    MERGE_SIZE,
    MERGE_Z,
    debrisAt,
    shatter,
} from "../SignalGate/finale.ts";
import {
    CROSSBAR_ROW,
    LETTER_CELLS,
    LETTER_COLS,
    LETTER_ROWS,
    LETTER_Z,
    MAX_SPIN,
    NO_OFFSET,
    REPEL_MAX,
    REST_RX,
    RX_LIMIT,
    SETTLE_S,
    SPIN_REST,
    SWAY_AMP,
    SWAY_PERIOD,
    anchorWorld,
    atlasTargets,
    cellSizeFor,
    flyAt,
    letterBounds,
    morphAt,
    repelOffset,
    screenOf,
    slotPose,
    spinAt,
    swayAt,
    targetForCell,
    type Spin,
    type Vec2,
} from "./glyph.ts";

/* A seeded PRNG so a failure is the same failure twice. Same shape as the one
   `finale.test.ts` uses, and for the same reason. */
function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const VIEWPORTS = [
    { w: 1440, h: 900 },
    { w: 768, h: 1024 },
    { w: 375, h: 812 },
];

const ANCHOR = { x: 0.2, y: -0.1 };

/* ══ The letterform ══════════════════════════════════ */

test("THE LETTER IS EXACTLY ONE SLOT PER FRAGMENT", () => {
    /* The burst cuts FRAGMENT_COUNT pieces and every one builds the letter,
       one for one. Neither file mentions the other, so this is the only thing
       keeping them in step — and the failure is a letter with a hole in it or
       a cube with nowhere to go, either of which looks like a bug rather than
       like a number that drifted. */
    assert.equal(LETTER_CELLS.length, FRAGMENT_COUNT);
});

test("the cells actually read as an A", () => {
    const at = (cx: number, cy: number) =>
        LETTER_CELLS.some((c) => c.cx === cx && c.cy === cy && c.cz === 0);

    const rowCols = (cy: number) =>
        LETTER_CELLS.filter((c) => c.cy === cy && c.cz === 0)
            .map((c) => c.cx)
            .sort((a, b) => a - b);

    // The crossbar spans the full width. It is the defining stroke.
    assert.deepEqual(rowCols(CROSSBAR_ROW), [0, 1, 2, 3, 4]);

    // The apex is narrower than the base — that is what makes it an A and
    // not an H or an N.
    const apex = rowCols(0);
    const base = rowCols(LETTER_ROWS - 1);
    const span = (r: number[]) => r[r.length - 1] - r[0];
    assert.ok(span(apex) < span(base), "apex must be narrower than the base");

    // Both legs, and the space between them left open.
    assert.deepEqual(base, [0, LETTER_COLS - 1]);

    // A counter: at least one empty cell fully enclosed by letter above,
    // below and to both sides. Lose this and the A fills in solid.
    let counters = 0;
    for (let cy = 1; cy < CROSSBAR_ROW; cy++) {
        for (let cx = 1; cx < LETTER_COLS - 1; cx++) {
            if (at(cx, cy)) continue;
            if (
                LETTER_CELLS.some((c) => c.cz === 0 && c.cx === cx && c.cy < cy) &&
                at(cx - 1, cy) &&
                at(cx + 1, cy)
            ) {
                counters++;
            }
        }
    }
    assert.ok(counters > 0, "the A must have a counter");
});

test("the letter is one connected solid", () => {
    /* 27 cubes in two disjoint clumps is not a letter, it is two objects. Any
       edit to the art that strands a cell shows up here and nowhere else. */
    const key = (c: { cx: number; cy: number; cz: number }) =>
        `${c.cx},${c.cy},${c.cz}`;
    const all = new Set(LETTER_CELLS.map(key));
    const seen = new Set<string>();
    const queue = [LETTER_CELLS[0]];
    seen.add(key(LETTER_CELLS[0]));

    const steps = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ];

    while (queue.length > 0) {
        const c = queue.pop()!;
        for (const [dx, dy, dz] of steps) {
            const n = { cx: c.cx + dx, cy: c.cy + dy, cz: c.cz + dz };
            const k = key(n);
            if (!all.has(k) || seen.has(k)) continue;
            seen.add(k);
            queue.push(n);
        }
    }

    assert.equal(seen.size, LETTER_CELLS.length);
});

test("only the crossbar is two cells deep", () => {
    /* Depth exists to make the letter read as a solid when it turns, and the
       crossbar is where the strokes cross — the one place it means something.
       Depth anywhere else is a bulge nobody asked for. */
    const deep = LETTER_CELLS.filter((c) => c.cz === 1);
    assert.equal(deep.length, LETTER_COLS);
    assert.ok(deep.every((c) => c.cy === CROSSBAR_ROW));
});

/* ══ Placement ═══════════════════════════════════════ */

test("the anchor lands the letter where it was asked to", () => {
    /* `anchorWorld` inverts the projection, including a Y flip that looks
       almost right when it is backwards. Round-tripping it through `screenOf`
       is the check. */
    for (const { w, h } of VIEWPORTS) {
        for (const [fx, fy] of [
            [0.74, 0.36],
            [0.5, 0.5],
            [0.2, 0.8],
        ]) {
            const world = anchorWorld(fx * w, fy * h, LETTER_Z, w, h);
            const back = screenOf(
                { ...world, z: LETTER_Z, rx: 0, ry: 0, size: 0.1 },
                w,
                h,
            );
            assert.ok(Math.abs(back.x - fx * w) < 1e-6);
            assert.ok(Math.abs(back.y - fy * h) < 1e-6);
        }
    }
});

test("THE LETTER IS A RIGID BODY", () => {
    /* Every cell's distance to every other must survive rotation. Rotating
       the cubes without rotating their positions gives 27 blocks spinning
       inside a letter that never moves — which is a far stranger thing to
       watch than it is to describe, and it type-checks perfectly. */
    const rest = LETTER_CELLS.map((_, i) => slotPose(i, ANCHOR, REST_RX, 0));

    for (const [rx, ry] of [
        [0.4, 1.1],
        [-0.55, 3.3],
        [0.62, -2.2],
    ]) {
        const turned = LETTER_CELLS.map((_, i) => slotPose(i, ANCHOR, rx, ry));
        for (let i = 0; i < rest.length; i += 4) {
            for (let j = i + 1; j < rest.length; j += 5) {
                const a = Math.hypot(
                    rest[i].x - rest[j].x,
                    rest[i].y - rest[j].y,
                    rest[i].z - rest[j].z,
                );
                const b = Math.hypot(
                    turned[i].x - turned[j].x,
                    turned[i].y - turned[j].y,
                    turned[i].z - turned[j].z,
                );
                assert.ok(
                    Math.abs(a - b) < 1e-9,
                    `pair ${i}/${j} stretched by ${Math.abs(a - b)}`,
                );
            }
        }
    }
});

test("the letter fits on screen and stays off the copy column", () => {
    for (const { w, h } of VIEWPORTS) {
        const anchor = anchorWorld(w * 0.74, h * 0.36, LETTER_Z, w, h);
        // Worst case for width is the letter turned side-on.
        for (const ry of [0, 0.6, 1.2, Math.PI / 2, 2.4]) {
            const poses = LETTER_CELLS.map((_, i) =>
                slotPose(i, anchor, RX_LIMIT, ry),
            );
            const b = letterBounds(poses, w, h);
            assert.ok(b.x > 0, `left edge off screen at ${w}×${h}`);
            assert.ok(b.x + b.w < w, `right edge off screen at ${w}×${h}`);
            assert.ok(b.y > 0, `top off screen at ${w}×${h}`);
            assert.ok(b.y + b.h < h, `bottom off screen at ${w}×${h}`);
        }
    }
});

/* ══ The flight ══════════════════════════════════════ */

test("the flight starts on the merged cube, exactly", () => {
    /* The gate stops painting at the burst and this picks it up. Continuity
       is not a matched timing — it is the same arithmetic, so the first frame
       drawn here is the last frame the gate would have drawn. */
    const frags = shatter(seeded(7));
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);

    frags.forEach((f, i) => {
        const start = flyAt(f, slotPose(i, anchor, REST_RX, 0), 0).pose;
        const merged = debrisAt(f, 0).pose;
        assert.ok(Math.abs(start.x - merged.x) < 1e-12);
        assert.ok(Math.abs(start.y - merged.y) < 1e-12);
        assert.ok(Math.abs(start.z - merged.z) < 1e-12);
        assert.ok(Math.abs(start.size - merged.size) < 1e-12);
    });
});

test("EVERY FRAGMENT LANDS EXACTLY IN ITS SLOT", () => {
    /* "Nearly the same" is the failure that matters. Six blocks that almost
       converge show as a soft multiplied edge; 27 cubes that almost land show
       as a letter whose blocks do not quite line up, and both read as a
       rendering fault rather than as a design. */
    const frags = shatter(seeded(11));
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);

    frags.forEach((f, i) => {
        const slot = slotPose(i, anchor, REST_RX, 0.4);
        const end = flyAt(f, slot, 1).pose;
        assert.ok(Math.abs(end.x - slot.x) < 1e-9, "x");
        assert.ok(Math.abs(end.y - slot.y) < 1e-9, "y");
        assert.ok(Math.abs(end.z - slot.z) < 1e-9, "z");
        assert.ok(Math.abs(end.rx - slot.rx) < 1e-9, "rx");
        assert.ok(Math.abs(end.ry - slot.ry) < 1e-9, "ry");
        assert.ok(Math.abs(end.size - slot.size) < 1e-9, "size");
    });
});

test("nothing crosses the camera plane on the way out or back", () => {
    /* A piece thrown past the camera projects to a wild coordinate and
       streaks a polygon across the whole screen — in the middle of the one
       gesture on the site that has to be clean. */
    const frags = shatter(seeded(29));
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);
    const ceiling = MERGE_SIZE / AXIS_CELLS / (MERGE_Z - MERGE_SIZE);

    frags.forEach((f, i) => {
        const slot = slotPose(i, anchor, REST_RX, 0);
        for (let u = 0; u <= 1.0001; u += 0.01) {
            const { pose, alpha } = flyAt(f, slot, u);
            assert.ok(pose.z >= NEAR * 0.9 - 1e-9, `z ${pose.z} at u=${u}`);
            assert.ok(
                pose.size / pose.z <= ceiling + 1e-9,
                `piece looms at u=${u}`,
            );
            assert.equal(alpha, 1);
            assert.ok(Number.isFinite(pose.x) && Number.isFinite(pose.y));
        }
    });
});

test("the flight goes out before it comes home", () => {
    /* Otherwise it is not a burst that reassembles, it is a cube that slides
       across the screen. Every fragment must be further from its start part
       way through than it is at the turn's end. */
    const frags = shatter(seeded(3));
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);
    let travelled = 0;

    frags.forEach((f, i) => {
        const slot = slotPose(i, anchor, REST_RX, 0);
        const a = flyAt(f, slot, 0).pose;
        const b = flyAt(f, slot, 0.3).pose;
        if (Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 0.2) travelled++;
    });

    assert.ok(
        travelled >= FRAGMENT_COUNT - 1,
        `only ${travelled} fragments actually flew out`,
    );
});

/* ══ The morph ═══════════════════════════════════════ */

test("THE MORPH ONLY EVER TRAVELS TOWARD ITS TARGET", () => {
    /* A scatter that happens to end in the right place is a different thing
       to watch than a letter coming apart INTO the diagram. The distinction
       is entirely whether the distance decreases the whole way. */
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);
    const targets = atlasTargets(1440, 900, "desktop");

    LETTER_CELLS.forEach((_, i) => {
        const slot = slotPose(i, anchor, REST_RX, 0.2);
        const t = targets[targetForCell(i, targets.length)];
        const world = anchorWorld(t.x, t.y, LETTER_Z, 1440, 900);
        const target = { ...world, z: LETTER_Z, rx: 0, ry: 0, size: 0.01 };

        let prev = Infinity;
        for (let p = 0; p <= 1.0001; p += 0.02) {
            const { pose } = morphAt(slot, target, p);
            const d = Math.hypot(
                pose.x - target.x,
                pose.y - target.y,
                pose.z - target.z,
            );
            assert.ok(d <= prev + 1e-9, `cube ${i} backtracked at p=${p}`);
            prev = d;
        }
    });
});

test("everything is gone by the end of the morph", () => {
    /* The letter must not still be sitting on the page when the atlas takes
       over. Anything left opaque simply pops out of existence at the end of
       the window. */
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);
    const target = { x: 0, y: 0, z: LETTER_Z, rx: 0, ry: 0, size: 0.01 };

    LETTER_CELLS.forEach((_, i) => {
        const slot = slotPose(i, anchor, REST_RX, 0);
        assert.equal(morphAt(slot, target, 1).alpha, 0);

        let prev = Infinity;
        for (let p = 0; p <= 1.0001; p += 0.02) {
            const { alpha, pose } = morphAt(slot, target, p);
            assert.ok(alpha <= prev + 1e-9, "alpha must never climb back");
            assert.ok(pose.z >= NEAR * 0.9 - 1e-9);
            prev = alpha;
        }
    });
});

test("cubes shrink into the atlas rather than landing on top of it", () => {
    const anchor = anchorWorld(1440 * 0.74, 900 * 0.36, LETTER_Z, 1440, 900);
    const target = { x: 0, y: 0, z: LETTER_Z, rx: 0, ry: 0, size: 0.01 };
    const slot = slotPose(0, anchor, REST_RX, 0);

    let prev = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.02) {
        const { pose } = morphAt(slot, target, p);
        assert.ok(pose.size <= prev + 1e-9);
        prev = pose.size;
    }
    assert.ok(morphAt(slot, target, 1).pose.size < 0.35 * cellSizeFor());
});

/* ══ Atlas anchors ═══════════════════════════════════ */

test("the atlas targets are the atlas's own, and all on screen", () => {
    for (const { w, h } of VIEWPORTS) {
        const mode = w >= 1024 ? "desktop" : w >= 768 ? "tablet" : "mobile";
        const targets = atlasTargets(w, h, mode);

        assert.ok(targets.length >= 2, "core plus at least one branch");
        for (const t of targets) {
            assert.ok(t.x > 0 && t.x < w, `target x ${t.x} off screen`);
            assert.ok(t.y > 0 && t.y < h, `target y ${t.y} off screen`);
        }

        // Every anchor is actually used, or a branch endpoint is drawn with
        // nothing arriving at it.
        const used = new Set(
            LETTER_CELLS.map((_, i) => targetForCell(i, targets.length)),
        );
        assert.equal(used.size, targets.length);
    }
});

/* ══ Rotation ════════════════════════════════════════ */

test("THE LETTER CAN NEVER INVERT", () => {
    /* Unbounded tilt turns the A upside down and inside out, and there is no
       angle at which that is a thing anyone meant. Drag is the only input
       that can do it, so the clamp has to survive a hostile one. */
    const rand = seeded(5);
    let s: Spin = SPIN_REST;

    for (let i = 0; i < 20000; i++) {
        const drag = { dx: (rand() * 2 - 1) * 600, dy: (rand() * 2 - 1) * 600 };
        s = spinAt(s, 1 / 60, drag);
        assert.ok(Math.abs(s.rx) <= RX_LIMIT + 1e-12, `rx reached ${s.rx}`);
        assert.ok(Number.isFinite(s.ry));
        assert.ok(Math.abs(s.vrx) <= MAX_SPIN + 1e-9);
        assert.ok(Math.abs(s.vry) <= MAX_SPIN + 1e-9);
    }
});

test("A TIMER BRINGS THE SPIN HOME, NOT FRICTION", () => {
    /* The whole lesson of `flight.ts` next door: a body decaying at 0.86 per
       second solved to a 16-to-25 second trip home, which is not a return, it
       is an abandonment. Decay shapes the arc; the cap decides when it ends.

       A hard flick — 220px in one frame, about 13,000 px/s. */
    let s: Spin = spinAt(SPIN_REST, 1 / 60, { dx: 220, dy: 120 });
    assert.ok(Math.abs(s.vry) > 1, "the flick should actually launch it");

    const frames = Math.ceil((SETTLE_S + 6) * 60);
    for (let i = 0; i < frames; i++) s = spinAt(s, 1 / 60, null);

    assert.equal(s.vrx, 0);
    assert.equal(s.vry, 0);
    assert.ok(
        Math.abs(s.rx - REST_RX) < 1e-3,
        `tilt settled at ${s.rx}, wanted ${REST_RX}`,
    );
    assert.ok(Math.abs(s.ry) < 2e-2, `turn settled at ${s.ry}, wanted 0`);
});

test("the turn never wanders further out once the reader lets go", () => {
    /* `ry` is unbounded while dragging — spin the letter round ten times and
       it holds ten turns of offset, which is the reader's business. What must
       not happen is it drifting FURTHER from home on its own after the free
       spin is spent, because then there is no time at which it is back. */
    let s: Spin = spinAt(SPIN_REST, 1 / 60, { dx: 900, dy: -400 });
    for (let i = 0; i < Math.ceil(SETTLE_S * 60) + 2; i++) {
        s = spinAt(s, 1 / 60, null);
    }

    let prev = Math.abs(s.ry);
    for (let i = 0; i < 600; i++) {
        s = spinAt(s, 1 / 60, null);
        const now = Math.abs(s.ry);
        assert.ok(now <= prev + 1e-12, `turn grew back to ${now}`);
        prev = now;
    }
    assert.ok(prev < 0.05, `still ${prev} radians out after 10s`);
});

test("THE RESTING SWAY NEVER GOES EDGE-ON", () => {
    /* Edge-on the A is a slab: no counter, no crossbar, no legs. A letter
       that revolves continuously spends part of every cycle not being a
       letter, and no amount of tuning the speed fixes that — only bounding
       the angle does. The stills are what made this obvious; nothing in the
       arithmetic would have. */
    for (let t = 0; t < SWAY_PERIOD * 3; t += 0.05) {
        assert.ok(Math.abs(swayAt(t)) <= SWAY_AMP + 1e-12);
    }
    assert.ok(SWAY_AMP < 0.75, "the sway must stay well short of side-on");

    // And it genuinely moves — a still letter is a dead canvas.
    let lo = Infinity;
    let hi = -Infinity;
    for (let t = 0; t < SWAY_PERIOD; t += 0.05) {
        lo = Math.min(lo, swayAt(t));
        hi = Math.max(hi, swayAt(t));
    }
    assert.ok(hi - lo > 0.6, `the sway only covered ${hi - lo} radians`);
});

test("a backgrounded tab cannot spin the letter to an arbitrary angle", () => {
    /* rAF hands back the whole time the tab was away. Thirty seconds
       integrated in one step is the same trap `MAX_DT` catches for the
       entrance field. */
    const one = spinAt(SPIN_REST, 30, null);
    const capped = spinAt(SPIN_REST, 0.05, null);
    assert.ok(Math.abs(one.ry - capped.ry) < 1e-12);
});

/* ══ Repulsion ═══════════════════════════════════════ */

test("the shove is bounded however the pointer moves", () => {
    const rand = seeded(17);
    let off: Vec2 = NO_OFFSET;

    for (let i = 0; i < 30000; i++) {
        const pointer = { x: rand() * 1440, y: rand() * 900 };
        const cell = { x: rand() * 1440, y: rand() * 900 };
        off = repelOffset(off, cell, pointer, 1 / 60);
        assert.ok(
            Math.hypot(off.x, off.y) <= REPEL_MAX + 1e-9,
            `offset reached ${Math.hypot(off.x, off.y)}`,
        );
        assert.ok(Number.isFinite(off.x) && Number.isFinite(off.y));
    }
});

test("cubes come back when the cursor leaves", () => {
    /* Without this the letter is permanently dented by wherever the reader's
       mouse happened to pass, which is a slow way to destroy a letterform. */
    let off: Vec2 = { x: REPEL_MAX, y: -REPEL_MAX };
    for (let i = 0; i < 180; i++) {
        off = repelOffset(off, { x: 0, y: 0 }, null, 1 / 60);
    }
    assert.ok(Math.hypot(off.x, off.y) < 0.5, `left dented by ${off.x},${off.y}`);
});

test("a cube exactly under the pointer does not become NaN", () => {
    /* The third of the three classic failure modes: no direction, `hypot` is
       zero, and one division poisons every number downstream for the rest of
       the session. */
    let off: Vec2 = NO_OFFSET;
    for (let i = 0; i < 120; i++) {
        off = repelOffset(off, { x: 500, y: 500 }, { x: 500, y: 500 }, 1 / 60);
        assert.ok(Number.isFinite(off.x) && Number.isFinite(off.y));
    }
    assert.ok(Math.hypot(off.x, off.y) > 1, "a direct hit should still push");
});

test("the shove pushes away from the pointer, not toward it", () => {
    let off: Vec2 = NO_OFFSET;
    for (let i = 0; i < 120; i++) {
        off = repelOffset(off, { x: 600, y: 400 }, { x: 500, y: 400 }, 1 / 60);
    }
    assert.ok(off.x > 0, "a cube right of the pointer must move right");
    assert.ok(Math.abs(off.y) < 1e-6);
});
