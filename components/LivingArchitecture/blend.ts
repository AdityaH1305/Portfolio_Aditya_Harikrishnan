import { type BranchDef } from "./config.ts";
import { type StageConfig } from "./stages.ts";

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
