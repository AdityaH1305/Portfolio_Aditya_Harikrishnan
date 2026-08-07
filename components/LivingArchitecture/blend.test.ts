import assert from "node:assert/strict";
import test from "node:test";
import { blendStages, bracket } from "./blend.ts";
import { STAGES } from "./stages.ts";
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
