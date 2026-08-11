import { CATEGORIES, PROJECTS, SKILLS, inProject } from "./data.ts";

/* ══════════════════════════════════════════════════════
   Orbit solver

   Pure. No canvas, no module state, no RNG — which is what
   makes the arithmetic provable in plain node, the same
   reasoning as LivingArchitecture/blend.ts. It matters more
   here than it looks: the browser verification path in this
   repo is unreliable (a hidden pane pauses rAF and the
   canvas never renders a frame), so anything checkable
   without one should be.

   Determinism comes from indices, never from a seeded
   generator. A generator would still be reproducible but it
   would carry state across calls, and `solve` is called
   again on every resize and every regroup.
   ══════════════════════════════════════════════════════ */

export interface Box {
    w: number;
    h: number;
}

export type ViewMode =
    | { mode: "category" }
    | { mode: "project"; projectId: string };

export interface Anchor {
    id: string;
    label: string;
    x: number;
    y: number;
    kind: "category" | "project";
    /** Anchors that are the subject of the current view burn brighter. */
    lit: boolean;
    /**
     * Outer orbit radius of this system.
     *
     * Carried on the anchor so the engine can size the star's glow from it.
     * A fixed glow was drawn at 46px while radii varied from 67 to 112 — it
     * swamped the small systems and, on a narrow panel, got crossed by the
     * inner ring of the big one.
     */
    radius: number;
}

export interface Orbit {
    /** Index into SKILLS. */
    skill: number;
    anchorId: string;
    radius: number;
    /** Radians at t=0. */
    phase: number;
    /** Radians per second, signed — negative orbits the other way. */
    speed: number;
    /** False for bodies with no part in the current view. */
    lit: boolean;
}

export interface Solution {
    anchors: Anchor[];
    orbits: Orbit[];
}

/* ── Geometry constants ────────────────────────────────
   Fractions of the box, so the composition holds its shape at any panel
   size. A grid is deliberate over an ellipse: an ellipse gives uneven
   neighbour gaps, and the orbit radius has to be clamped to the SMALLEST
   of them, so every orbit ends up sized by the worst case.

   Two column counts, because the constraint on a narrow panel is not the
   orbits — it is the category LABELS. "MACHINE LEARNING" is ~110px at 11px
   mono, and three columns on a 340px panel puts the anchors 109px apart, so
   the labels collide long before the bodies do. */
const GRID_3 = { x: [0.18, 0.5, 0.82], y: [0.3, 0.73] };
const GRID_2 = { x: [0.27, 0.73], y: [0.19, 0.5, 0.81] };

/** Below this panel width the grid drops to two columns. */
export const NARROW_W = 620;

/** Bodies beyond this many in one system spill onto a second ring. */
const RING_SPLIT = 5;
/** Inner ring radius as a fraction of the outer. */
const INNER_RING = 0.62;

/**
 * Breathing room between two neighbouring systems' outermost orbits, px.
 *
 * Bodies are ~3px and their labels are far wider, but labels fade by pointer
 * proximity so only one or two are ever legible at once — this only has to
 * stop the ORBITS reading as touching.
 */
const CLEARANCE = 20;

/** Fraction of its own radius that a system's star may glow. */
export const GLOW_RATIO = 0.42;
export const GLOW_MIN = 22;
export const GLOW_MAX = 52;

/** Glow radius the engine will draw for a system of this size. */
export function glowRadius(systemRadius: number): number {
    return Math.max(GLOW_MIN, Math.min(GLOW_MAX, systemRadius * GLOW_RATIO));
}

/**
 * Orbital speed falls off with radius, as it does for anything actually
 * in orbit. Not physically calibrated — just `1/sqrt(r)`, which is enough
 * for the inner bodies to visibly lead the outer ones.
 */
const BASE_SPEED = 0.22;

const TAU = Math.PI * 2;

/**
 * How many bodies on each ring. One ring up to RING_SPLIT, then two.
 *
 * Split by SHARE OF CIRCUMFERENCE, not evenly and not by body count. The
 * inner ring sits at INNER_RING × r, so it has 62% of the outer ring's
 * circumference and should carry 0.62/1.62 ≈ 38% of the bodies.
 *
 * The first version used `ceil(count × 0.6)`, which handed the inner ring
 * 62% of the bodies and the roomy outer ring the remainder — precisely
 * backwards. For the 8-skill Machine Learning system that produced [5, 3]:
 * five bodies crammed onto the tight ring at 59.8px apart while three had
 * 160px on the outer. That was most of the reported clutter.
 */
export function ringSizes(count: number): number[] {
    if (count <= 0) return [];
    if (count <= RING_SPLIT) return [count];
    const inner = Math.max(1, Math.round((count * INNER_RING) / (1 + INNER_RING)));
    return [inner, count - inner];
}

/**
 * Radius a system needs per unit of arc spacing between its bodies.
 *
 * For a ring of n bodies at radius `f × r`, the gap between neighbours is
 * `2π·f·r / n`. Holding that gap equal across every ring means `r` has to be
 * proportional to `max(n / f)` over the system's rings — that maximum is what
 * this returns.
 *
 * Single ring of n → n. Two rings [3, 5] → max(3/0.62, 5/1) = 5.
 */
export function demand(count: number): number {
    const sizes = ringSizes(count);
    if (sizes.length === 0) return 0;
    if (sizes.length === 1) return sizes[0];
    return Math.max(sizes[0] / INNER_RING, sizes[1]);
}

/**
 * Largest radius scale that keeps every pair of systems clear of each other.
 *
 * Replaces a flat `minGap × PACKING`, which gave every system the same radius
 * regardless of population — so the 8-body system packed into the same
 * footprint as the 3-body one. Solving the pairwise constraint instead means
 * the answer adapts on its own to the narrow two-column grid, a different
 * panel aspect, or a category gaining a skill.
 *
 * `shares` are per-anchor multipliers (demand ÷ max demand); the returned
 * scale multiplies them to give each system its actual radius.
 */
function fitScale(
    anchors: { x: number; y: number }[],
    shares: number[],
): number {
    let scale = Infinity;
    for (let i = 0; i < anchors.length; i++) {
        for (let j = i + 1; j < anchors.length; j++) {
            const d = Math.hypot(
                anchors[i].x - anchors[j].x,
                anchors[i].y - anchors[j].y,
            );
            const sum = shares[i] + shares[j];
            if (sum <= 0) continue;
            scale = Math.min(scale, (d - CLEARANCE) / sum);
        }
    }
    return Number.isFinite(scale) ? Math.max(scale, 1) : 1;
}

/**
 * Distribute `count` bodies over one or two rings around a single anchor.
 *
 * `offset` de-phases one system from the next so six of them do not all
 * present the same spoke pattern at t=0 — a golden-angle step, which is the
 * cheapest way to avoid a visible repeat without randomness.
 */
function ringOrbits(
    members: number[],
    anchorId: string,
    outerRadius: number,
    offset: number,
    lit: boolean,
): Orbit[] {
    const sizes = ringSizes(members.length);
    const out: Orbit[] = [];
    let cursor = 0;

    sizes.forEach((size, ring) => {
        const radius =
            sizes.length === 1
                ? outerRadius
                : ring === 0
                  ? outerRadius * INNER_RING
                  : outerRadius;

        for (let i = 0; i < size; i++) {
            out.push({
                skill: members[cursor++],
                anchorId,
                radius,
                phase: (i / size) * TAU + offset + ring * 0.7,
                // Rings counter-rotate: two concentric rings turning the same
                // way read as one rigid wheel rather than as a system.
                speed:
                    (BASE_SPEED / Math.sqrt(Math.max(radius, 1) / 100)) *
                    (ring % 2 === 0 ? 1 : -1),
                lit,
            });
        }
    });

    return out;
}

/** Category view: six systems on a grid, every body lit. */
function solveByCategory(box: Box): Solution {
    const grid = box.w < NARROW_W ? GRID_2 : GRID_3;
    const cols = grid.x.length;

    const members = CATEGORIES.map((c) =>
        SKILLS.map((s, idx) => (s.category === c.id ? idx : -1)).filter(
            (idx) => idx >= 0,
        ),
    );

    /* Each system's radius is proportional to what it needs to hold its
       bodies at the same spacing as every other system. Normalising by the
       largest keeps the busiest system as big as the grid allows and lets the
       quiet ones sit smaller — which is both what declutters the field and
       what makes it read as a real set of systems rather than a tiling. */
    const demands = members.map((m) => demand(m.length));
    const peak = Math.max(...demands);
    const shares = demands.map((d) => d / peak);

    const points = CATEGORIES.map((_, i) => ({
        x: grid.x[i % cols] * box.w,
        y: grid.y[Math.floor(i / cols)] * box.h,
    }));

    const scale = fitScale(points, shares);

    const anchors: Anchor[] = CATEGORIES.map((c, i) => ({
        id: c.id,
        label: c.label,
        x: points[i].x,
        y: points[i].y,
        kind: "category" as const,
        lit: true,
        radius: shares[i] * scale,
    }));

    const orbits = anchors.flatMap((a, i) =>
        ringOrbits(members[i], a.id, a.radius, i * 2.399, true),
    );

    return { anchors, orbits };
}

/**
 * Project view: the chosen project alone at centre, its skills drawn into
 * one system around it, everything else pushed to a cold outer ring.
 *
 * One star rather than six. Showing all six project systems at once would
 * force a skill used by two projects into one of them arbitrarily, and the
 * whole point of this view is that it answers "what did this project take?"
 * without lying by omission.
 */
function solveByProject(box: Box, projectId: string): Solution {
    const project = PROJECTS.find((p) => p.id === projectId);
    if (!project) return solveByCategory(box);

    const cx = box.w / 2;
    const cy = box.h / 2;
    const core = Math.min(box.w, box.h) * 0.2;

    const anchors: Anchor[] = [
        {
            id: project.id,
            label: project.label,
            x: cx,
            y: cy,
            kind: "project",
            lit: true,
            radius: core,
        },
    ];

    const members: number[] = [];
    const outsiders: number[] = [];
    SKILLS.forEach((s, i) =>
        (inProject(s, projectId) ? members : outsiders).push(i),
    );

    const orbits = ringOrbits(members, project.id, core, 0, true);

    /* The cold ring. Anchored to the same star so there is exactly one
       anchor to resolve against, but far enough out to read as excluded
       rather than as a third ring of the system. */
    const cold = Math.min(box.w, box.h) * 0.46;
    outsiders.forEach((skill, i) => {
        orbits.push({
            skill,
            anchorId: project.id,
            radius: cold,
            phase: (i / Math.max(outsiders.length, 1)) * TAU,
            speed: BASE_SPEED / Math.sqrt(cold / 100) / 2,
            lit: false,
        });
    });

    return { anchors, orbits };
}

export function solve(mode: ViewMode, box: Box): Solution {
    return mode.mode === "project"
        ? solveByProject(box, mode.projectId)
        : solveByCategory(box);
}

/** Position of a body at time `t` seconds. */
export function positionAt(
    orbit: Orbit,
    anchor: Anchor,
    t: number,
): { x: number; y: number } {
    const a = orbit.phase + orbit.speed * t;
    return {
        x: anchor.x + Math.cos(a) * orbit.radius,
        y: anchor.y + Math.sin(a) * orbit.radius,
    };
}
