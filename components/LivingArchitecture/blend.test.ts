import assert from "node:assert/strict";
import test from "node:test";
import {
    HOLD_REACH,
    HOLD_SPAN,
    blendStages,
    bracket,
    progressAt,
} from "./blend.ts";
import { SECTION_IDS, STAGES } from "./stages.ts";
import { type StageConfig } from "./stages.ts";

/* Run with:  node --experimental-strip-types --test components/LivingArchitecture/blend.test.ts
   Pure module, so no DOM and no browser needed. */

const ids = (s: StageConfig) => s.branches.map((b) => b.id).sort();

const scalars = (s: StageConfig): number[] => [
    s.coreOpacity,
    s.coreGlowScale,
    s.coreBreathePeriod,
    s.clusterOpacity,
    s.systemPulseAmplitude,
];

/** blendStages folds overrides into branches, so compare against the same shape. */
function normalized(s: StageConfig): StageConfig {
    return blendStages(s, s, 0);
}

test("THE INDEX CONTRACT — one stage per section, and no spares", () => {
    /* SECTION_IDS[i] is drawn by STAGES[i]. Break the alignment and the atlas
       animates the wrong stage for the wrong section — silently, because
       nothing throws and every stage is a valid config on its own.

       This exists because the arrays have already moved together twice: once
       when the case studies were folded into a single `#work`, and once when
       `throughline` was removed and Approach was promoted to second. Both
       times the failure mode would have been a page that merely looked a bit
       off. The nav rail and the command palette carry their own copies of the
       order and are checked in the browser; this is the pair that can be
       proved here. */
    assert.equal(
        STAGES.length,
        SECTION_IDS.length,
        `${STAGES.length} stages for ${SECTION_IDS.length} sections`,
    );

    // And the growth curve still opens dormant and ends fully lit.
    assert.ok(
        STAGES[0].coreOpacity < STAGES[STAGES.length - 1].coreOpacity,
        "the atlas should end brighter than it starts",
    );
    assert.equal(SECTION_IDS[0], "intro");
    assert.equal(SECTION_IDS[SECTION_IDS.length - 1], "contact");
});

test("t=0 reproduces the first stage; branches it lacks start at zero", () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
        const got = blendStages(STAGES[i], STAGES[i + 1], 0);
        const from = STAGES[i];

        assert.equal(got.coreOpacity, from.coreOpacity, `pair ${i}`);
        assert.equal(got.signalMax, from.signalMax, `pair ${i}`);
        assert.deepEqual(got.clusterSegRange, from.clusterSegRange);

        for (const b of got.branches) {
            const src = from.branches.find((x) => x.id === b.id);
            if (src) {
                const expected =
                    from.branchOpacityOverrides[src.id] ?? src.opacity;
                assert.ok(Math.abs(b.opacity - expected) < 1e-9, `${b.id}`);
                assert.ok(Math.abs(b.length - src.length) < 1e-9, `${b.id}`);
            } else {
                // Present only in the next stage — must grow out of the core
                // rather than pop in, so it starts at zero on both axes.
                assert.equal(b.opacity, 0, `${b.id} opacity at t=0`);
                assert.equal(b.length, 0, `${b.id} length at t=0`);
            }
        }
    }
});

test("t=1 lands on the second stage's values", () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
        const got = blendStages(STAGES[i], STAGES[i + 1], 1);
        const want = STAGES[i + 1];
        assert.equal(got.coreOpacity, want.coreOpacity);
        assert.equal(got.signalMax, want.signalMax);
        for (const def of want.branches) {
            const g = got.branches.find((b) => b.id === def.id);
            const expected =
                want.branchOpacityOverrides[def.id] ?? def.opacity;
            assert.ok(g, `${def.id} present at pair ${i}`);
            assert.ok(Math.abs(g.opacity - expected) < 1e-9);
        }
    }
});

test("blending a stage with itself is identity at every t", () => {
    for (const s of STAGES) {
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
            assert.deepEqual(blendStages(s, s, t), normalized(s));
        }
    }
});

test("t is clamped", () => {
    const [a, b] = [STAGES[0], STAGES[1]];
    assert.deepEqual(blendStages(a, b, -5), blendStages(a, b, 0));
    assert.deepEqual(blendStages(a, b, 9), blendStages(a, b, 1));
});

test("branch set is the union of both stages, no duplicates", () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
        const got = ids(blendStages(STAGES[i], STAGES[i + 1], 0.5));
        const union = [
            ...new Set([
                ...STAGES[i].branches.map((b) => b.id),
                ...STAGES[i + 1].branches.map((b) => b.id),
            ]),
        ].sort();
        assert.deepEqual(got, union, `pair ${i}`);
        assert.equal(got.length, new Set(got).size, "no duplicate ids");
    }
});

test("identity fields are never interpolated", () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
        for (const t of [0, 0.3, 0.5, 0.7, 1]) {
            for (const b of blendStages(STAGES[i], STAGES[i + 1], t).branches) {
                const src =
                    STAGES[i].branches.find((x) => x.id === b.id) ??
                    STAGES[i + 1].branches.find((x) => x.id === b.id)!;
                assert.equal(b.seed, src.seed, `${b.id} seed`);
                assert.equal(b.role, src.role, `${b.id} role`);
                assert.equal(b.baseAngle, src.baseAngle, `${b.id} baseAngle`);
                assert.equal(b.segmentCount, src.segmentCount);
                assert.equal(b.angleVariance, src.angleVariance);
            }
        }
    }
});

test("scalars move monotonically between endpoints", () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
        const a = scalars(STAGES[i]);
        const b = scalars(STAGES[i + 1]);
        let prev = scalars(blendStages(STAGES[i], STAGES[i + 1], 0));

        for (let t = 0.05; t <= 1.0001; t += 0.05) {
            const cur = scalars(blendStages(STAGES[i], STAGES[i + 1], t));
            for (let k = 0; k < cur.length; k++) {
                const rising = b[k] >= a[k];
                const ok = rising
                    ? cur[k] >= prev[k] - 1e-9
                    : cur[k] <= prev[k] + 1e-9;
                assert.ok(ok, `scalar ${k} non-monotonic at pair ${i}, t=${t}`);
            }
            prev = cur;
        }
    }
});

test("opacities stay in [0,1] and lengths stay non-negative", () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
        for (let t = 0; t <= 1.0001; t += 0.1) {
            const s = blendStages(STAGES[i], STAGES[i + 1], t);
            assert.ok(s.coreOpacity >= 0 && s.coreOpacity <= 1);
            for (const b of s.branches) {
                assert.ok(b.opacity >= 0 && b.opacity <= 1, `${b.id} opacity`);
                assert.ok(b.length >= 0, `${b.id} length`);
            }
        }
    }
});

test("stage joins are continuous — end of one pair equals start of the next", () => {
    for (let i = 0; i < STAGES.length - 2; i++) {
        const end = blendStages(STAGES[i], STAGES[i + 1], 1);
        const start = blendStages(STAGES[i + 1], STAGES[i + 2], 0);

        assert.equal(end.coreOpacity, start.coreOpacity, `join ${i}`);

        // Compare only ids present in both — a branch dropping out at the
        // join legitimately differs (0 on one side).
        for (const b of end.branches) {
            const s = start.branches.find((x) => x.id === b.id);
            if (!s) continue;
            const inMiddle = STAGES[i + 1].branches.some((x) => x.id === b.id);
            if (!inMiddle) continue;
            assert.ok(
                Math.abs(b.opacity - s.opacity) < 1e-9,
                `join ${i}: ${b.id} opacity ${b.opacity} vs ${s.opacity}`,
            );
        }
    }
});

test("bracket never produces from === to", () => {
    const n = STAGES.length;
    for (let p = -1; p <= n + 1; p += 0.25) {
        const { from, to, t } = bracket(p, n);
        assert.notEqual(from, to, `p=${p}`);
        assert.ok(from >= 0 && to <= n - 1, `p=${p} in range`);
        assert.ok(t >= 0 && t <= 1, `p=${p} t in [0,1]`);
    }
});

/* ══ progressAt — the scroll mapping ═════════════════ */

/** Anchors shaped like the real page: seven sections, `#work` the long one. */
const ANCHORS = [0, 900, 1800, 15000, 16200, 17400, 18600];

test("progress is pinned at the ends", () => {
    assert.equal(progressAt(-500, ANCHORS), 0);
    assert.equal(progressAt(0, ANCHORS), 0);
    assert.equal(progressAt(18600, ANCHORS), ANCHORS.length - 1);
    assert.equal(progressAt(99999, ANCHORS), ANCHORS.length - 1);
});

test("PROGRESS ONLY EVER GOES FORWARD", () => {
    /* A non-monotonic mapping makes the atlas retract while the reader is
       still scrolling down, which reads as the diagram breaking rather than
       as a stage change. The hold curve is piecewise, so this is exactly the
       kind of thing an edit could quietly ruin. */
    let prev = -Infinity;
    for (let y = -200; y <= 19000; y += 17) {
        const p = progressAt(y, ANCHORS);
        assert.ok(p >= prev - 1e-12, `went backwards at y=${y}: ${p} < ${prev}`);
        prev = p;
    }
});

test("every segment boundary is continuous", () => {
    /* A discontinuity here is a visible jump in the atlas at the exact moment
       a section arrives — the one place a reader is most likely to notice. */
    for (let i = 1; i < ANCHORS.length - 1; i++) {
        const before = progressAt(ANCHORS[i] - 0.5, ANCHORS);
        const after = progressAt(ANCHORS[i] + 0.5, ANCHORS);
        assert.ok(
            Math.abs(after - before) < 0.02,
            `jump of ${after - before} at anchor ${i}`,
        );
        assert.ok(
            Math.abs(before - i) < 0.02,
            `anchor ${i} should land on stage ${i}, got ${before}`,
        );
    }
});

test("#WORK HOLDS NEAR THE PEAK INSTEAD OF THINNING OUT", () => {
    /* The case-study zone is 1300vh inside `#work`, so a linear mapping walks
       progress 2 → 3 across thirteen screens — and stage 3 drops three
       secondaries to 0.02 and cuts `signalMax` from 8 to 5. With the atlas now
       visible in there, that is the network dying while the reader reads. */
    const i = SECTION_IDS.indexOf("work");
    const lo = ANCHORS[i];
    const span = ANCHORS[i + 1] - lo;

    // Most of the section sits just past the peak, not drifting toward 3.
    for (const f of [0.1, 0.25, 0.5, 0.7, HOLD_SPAN]) {
        const p = progressAt(lo + span * f, ANCHORS);
        assert.ok(
            p >= i && p <= i + HOLD_REACH + 1e-9,
            `at ${f * 100}% through #work progress was ${p}`,
        );
    }

    // And it still gets all the way to the next stage by the end.
    assert.ok(progressAt(lo + span * 0.999, ANCHORS) > i + 0.9);
    assert.equal(progressAt(ANCHORS[i + 1], ANCHORS), i + 1);
});

test("no other section is affected", () => {
    /* The hold is one segment's business. Everything else stays linear, or the
       six other sections quietly get a different atlas than they were tuned
       against. */
    const work = SECTION_IDS.indexOf("work");
    for (let i = 0; i < ANCHORS.length - 1; i++) {
        if (i === work) continue;
        const span = ANCHORS[i + 1] - ANCHORS[i];
        for (const f of [0.25, 0.5, 0.75]) {
            const p = progressAt(ANCHORS[i] + span * f, ANCHORS);
            assert.ok(
                Math.abs(p - (i + f)) < 1e-9,
                `segment ${i} at ${f} gave ${p}, expected ${i + f}`,
            );
        }
    }
});

test("degenerate anchors cannot produce NaN", () => {
    /* `measure()` returns 0 for a section id it cannot find, so a renamed or
       missing section hands this a run of equal anchors. Dividing by that span
       poisons the stage index and the atlas stops drawing entirely. */
    const flat = [0, 0, 0, 500, 500, 900, 900];
    for (let y = -100; y <= 1200; y += 7) {
        assert.ok(Number.isFinite(progressAt(y, flat)), `NaN at y=${y}`);
    }
    assert.ok(Number.isFinite(progressAt(100, [0])));
    assert.equal(progressAt(100, []), 0);
});
