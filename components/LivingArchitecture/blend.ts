import { type BranchDef } from "./config.ts";
import { SECTION_IDS, type StageConfig } from "./stages.ts";

/* ══════════════════════════════════════════════════════
   Stage blending

   Pure. No DOM, no RNG, no engine state — which is what
   makes the scrub testable in plain node, without a
   browser.
   ══════════════════════════════════════════════════════ */

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpPair = (
    a: readonly [number, number],
    b: readonly [number, number],
    t: number,
): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/**
 * Fold `branchOpacityOverrides` into each branch's own opacity.
 *
 * Resolving overrides before blending rather than during collapses two
 * interacting maps into one number per branch, which is what keeps the
 * blend cheap to reason about and to test.
 */
function normalize(stage: StageConfig): Map<string, BranchDef> {
    const out = new Map<string, BranchDef>();
    for (const def of stage.branches) {
        const override = stage.branchOpacityOverrides[def.id];
        out.set(def.id, override === undefined ? def : { ...def, opacity: override });
    }
    return out;
}

/**
 * Blend two stages into a synthetic stage.
 *
 * Branches are unioned by id. A branch absent from one side is treated as
 * `{ length: 0, opacity: 0 }` there, so it grows out of / retracts into the
 * core — which matches applyStageTargets, that already zeroes both fields
 * for branches missing from a stage.
 *
 * Identity fields (id, role, baseAngle, segmentCount, angleVariance, seed,
 * width) are taken verbatim and never interpolated: the engine caches path
 * geometry per branch id, and interpolating a seed would desync the cache
 * from the drawn path.
 */
export function blendStages(
    a: StageConfig,
    b: StageConfig,
    tRaw: number,
): StageConfig {
    const t = tRaw < 0 ? 0 : tRaw > 1 ? 1 : tRaw;
    const ma = normalize(a);
    const mb = normalize(b);

    const ids: string[] = [];
    for (const id of ma.keys()) ids.push(id);
    for (const id of mb.keys()) if (!ma.has(id)) ids.push(id);

    const branches: BranchDef[] = ids.map((id) => {
        const da = ma.get(id);
        const db = mb.get(id);
        const identity = (da ?? db) as BranchDef;
        return {
            ...identity,
            length: lerp(da?.length ?? 0, db?.length ?? 0, t),
            opacity: lerp(da?.opacity ?? 0, db?.opacity ?? 0, t),
        };
    });

    return {
        coreOpacity: lerp(a.coreOpacity, b.coreOpacity, t),
        coreGlowScale: lerp(a.coreGlowScale, b.coreGlowScale, t),
        coreBreathePeriod: lerp(a.coreBreathePeriod, b.coreBreathePeriod, t),
        branches,
        clusterSegRange: lerpPair(a.clusterSegRange, b.clusterSegRange, t),
        clusterOpacity: lerp(a.clusterOpacity, b.clusterOpacity, t),
        // Pool sizes are counts — rounding keeps loop bounds integral.
        signalMax: Math.round(lerp(a.signalMax, b.signalMax, t)),
        signalSpawnRange: lerpPair(a.signalSpawnRange, b.signalSpawnRange, t),
        signalSpeedRange: lerpPair(a.signalSpeedRange, b.signalSpeedRange, t),
        conduitCount: Math.round(lerp(a.conduitCount, b.conduitCount, t)),
        systemPulseAmplitude: lerp(
            a.systemPulseAmplitude,
            b.systemPulseAmplitude,
            t,
        ),
        branchOpacityOverrides: {}, // folded into `branches` above
    };
}

/**
 * Split a continuous progress value into the stage pair that brackets it.
 *
 * `Math.min(floor(p), max - 1)` keeps `from + 1` in range at the top end
 * without a special case — using ceil instead would collapse to from === to
 * at every integer, freezing the blend at each stage boundary.
 */
export function bracket(
    p: number,
    stageCount: number,
): { from: number; to: number; t: number } {
    const max = stageCount - 1;
    const c = p < 0 ? 0 : p > max ? max : p;
    const from = Math.min(Math.floor(c), max - 1);
    return { from, to: from + 1, t: c - from };
}

/* ══════════════════════════════════════════════════════
   Scroll position → continuous stage

   Lifted out of `attachScrub` in LivingArchitecture.tsx so
   it can be proven in node, which is the same reason the
   rest of this module exists: the scrub is arithmetic, and
   arithmetic that only ever runs behind a scroll listener
   is arithmetic nobody can check.
   ══════════════════════════════════════════════════════ */

/**
 * The segment that holds near its stage instead of running straight through.
 *
 * DERIVED FROM `SECTION_IDS`, never written as a literal — this and the atlas
 * both index the same contract, and a hardcoded `2` would silently start
 * holding the wrong section the first time the order changed.
 */
const HOLD_SEGMENT = SECTION_IDS.indexOf("work");

/** Fraction of the `#work` segment spent near the peak. */
export const HOLD_SPAN = 0.85;

/** How far past stage 2 it creeps while holding. */
export const HOLD_REACH = 0.18;

/**
 * Why `#work` is special.
 *
 * The case-study zone is a 1300vh sticky scroller living INSIDE `#work`, so a
 * linear mapping spends thirteen screens walking progress from 2 to 3. Stage 2
 * is the atlas's Visual Peak — the only stage with all five secondaries lit and
 * the only one that saturates the signal pool — and stage 3 is Refinement,
 * where three of those secondaries collapse to 0.02 and `signalMax` drops from
 * 8 to 5.
 *
 * That did not matter while the atlas was faded to 0.08 and frozen through the
 * whole region. Now that it is visible there, a linear run would show the
 * network THINNING OUT across the entire section that is supposed to be
 * showing it off.
 *
 * So most of the segment creeps just past the peak and the run to stage 3
 * happens in the tail, as the reader leaves. Continuous at both ends, and
 * monotonic throughout — both asserted.
 */
function holdCurve(t: number): number {
    return t <= HOLD_SPAN
        ? (t / HOLD_SPAN) * HOLD_REACH
        : HOLD_REACH + ((t - HOLD_SPAN) / (1 - HOLD_SPAN)) * (1 - HOLD_REACH);
}

/**
 * Map a scroll position to a continuous stage index.
 *
 * Anchored to sections rather than to raw document progress: a long section
 * would otherwise drag the atlas out of sync with what is on screen. Each
 * anchor is where a section's top crosses 40% of the viewport — the same
 * activation point the reduced-motion IntersectionObserver path uses, so `p`
 * is an integer exactly when the discrete driver would have fired.
 */
export function progressAt(y: number, anchors: readonly number[]): number {
    const last = anchors.length - 1;
    if (last < 1) return 0;
    if (y <= anchors[0]) return 0;
    if (y >= anchors[last]) return last;

    for (let i = 0; i < last; i++) {
        if (y < anchors[i + 1]) {
            const span = anchors[i + 1] - anchors[i];
            if (span <= 0) return i;
            const t = (y - anchors[i]) / span;
            return i + (i === HOLD_SEGMENT ? holdCurve(t) : t);
        }
    }
    return last;
}
