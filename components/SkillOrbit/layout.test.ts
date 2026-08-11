import test from "node:test";
import assert from "node:assert/strict";

import {
    solve,
    positionAt,
    ringSizes,
    demand,
    glowRadius,
    NARROW_W,
    type Box,
    type Solution,
} from "./layout.ts";
import {
    CATEGORIES,
    PROJECTS,
    SKILLS,
    EVERY_PROJECT,
    inProject,
} from "./data.ts";

/* Run with:
   node --experimental-strip-types --test components/SkillOrbit/layout.test.ts */

const BOX: Box = { w: 1000, h: 620 };

/* ── Data integrity ────────────────────────────────────
   These guard the hand-maintained parts. A category id typo in SKILLS
   costs that skill its anchor and it silently never renders. */

test("every skill names a category that exists", () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const s of SKILLS) {
        assert.ok(ids.has(s.category), `${s.name} → unknown category ${s.category}`);
    }
});

test("every project reference resolves, wildcard aside", () => {
    const ids = new Set(PROJECTS.map((p) => p.id));
    for (const s of SKILLS) {
        for (const p of s.projects) {
            if (p === EVERY_PROJECT) continue;
            assert.ok(ids.has(p), `${s.name} → unknown project ${p}`);
        }
    }
});

test("every category has at least one skill", () => {
    for (const c of CATEGORIES) {
        assert.ok(
            SKILLS.some((s) => s.category === c.id),
            `${c.label} would render as an empty system`,
        );
    }
});

test("every project has at least one skill, or its star is empty", () => {
    for (const p of PROJECTS) {
        assert.ok(
            SKILLS.some((s) => inProject(s, p.id)),
            `${p.label} would regroup to nothing`,
        );
    }
});

/* ── The two special cases ─────────────────────────── */

test("the wildcard skill belongs to every project", () => {
    const python = SKILLS.find((s) => s.name === "Python");
    assert.ok(python);
    for (const p of PROJECTS) {
        assert.equal(inProject(python, p.id), true, `Python missing from ${p.label}`);
    }
});

test("coursework belongs to no project", () => {
    const coursework = SKILLS.filter((s) => s.projects.length === 0);
    assert.ok(coursework.length > 0, "expected some coursework entries");
    for (const s of coursework) {
        for (const p of PROJECTS) {
            assert.equal(inProject(s, p.id), false, `${s.name} claimed ${p.label}`);
        }
    }
});

/* ── The solver ────────────────────────────────────── */

test("category view gives every skill exactly one orbit", () => {
    const { orbits } = solve({ mode: "category" }, BOX);
    assert.equal(orbits.length, SKILLS.length);
    assert.equal(new Set(orbits.map((o) => o.skill)).size, SKILLS.length);
});

test("project view also gives every skill exactly one orbit", () => {
    for (const p of PROJECTS) {
        const { orbits } = solve({ mode: "project", projectId: p.id }, BOX);
        assert.equal(orbits.length, SKILLS.length, p.label);
        assert.equal(new Set(orbits.map((o) => o.skill)).size, SKILLS.length);
    }
});

test("every orbit resolves to an anchor that exists", () => {
    const modes = [
        { mode: "category" } as const,
        ...PROJECTS.map((p) => ({ mode: "project" as const, projectId: p.id })),
    ];
    for (const m of modes) {
        const { anchors, orbits } = solve(m, BOX);
        const ids = new Set(anchors.map((a) => a.id));
        for (const o of orbits) assert.ok(ids.has(o.anchorId));
    }
});

test("lit bodies in a project view are exactly that project's skills", () => {
    for (const p of PROJECTS) {
        const { orbits } = solve({ mode: "project", projectId: p.id }, BOX);
        for (const o of orbits) {
            assert.equal(
                o.lit,
                inProject(SKILLS[o.skill], p.id),
                `${SKILLS[o.skill].name} lit state wrong for ${p.label}`,
            );
        }
    }
});

test("regroup is reversible — category → project → category is identical", () => {
    const before = solve({ mode: "category" }, BOX);
    solve({ mode: "project", projectId: "ludex" }, BOX);
    const after = solve({ mode: "category" }, BOX);
    assert.deepEqual(after, before);
});

test("solve is pure — repeated calls agree", () => {
    const a = solve({ mode: "project", projectId: "gait" }, BOX);
    const b = solve({ mode: "project", projectId: "gait" }, BOX);
    assert.deepEqual(a, b);
});

test("an unknown project falls back to the category view", () => {
    const fallback = solve({ mode: "project", projectId: "nope" }, BOX);
    assert.deepEqual(fallback, solve({ mode: "category" }, BOX));
});

/* ── Geometry ──────────────────────────────────────── */

test("ring sizes account for every body and split only when crowded", () => {
    for (let n = 1; n <= 12; n++) {
        const sizes = ringSizes(n);
        assert.equal(
            sizes.reduce((a, b) => a + b, 0),
            n,
            `ring sizes lose bodies at ${n}`,
        );
        assert.ok(sizes.length <= 2);
        if (n <= 5) assert.equal(sizes.length, 1);
    }
    assert.deepEqual(ringSizes(0), []);
});

/* Every panel the layout has to survive: wide desktop, the narrow
   breakpoint either side, and a 375px phone. */
const PANELS: Box[] = [
    BOX,
    { w: NARROW_W + 1, h: 620 },
    { w: NARROW_W - 1, h: 560 },
    { w: 327, h: 460 },
];

test("no body orbits outside the panel, at any width", () => {
    const modes = [
        { mode: "category" } as const,
        ...PROJECTS.map((p) => ({ mode: "project" as const, projectId: p.id })),
    ];
    for (const box of PANELS) {
        for (const m of modes) {
            const { anchors, orbits } = solve(m, box);
            const byId = new Map(anchors.map((a) => [a.id, a]));
            for (const o of orbits) {
                const a = byId.get(o.anchorId)!;
                // Sample the whole orbit, not just t=0.
                for (let k = 0; k < 16; k++) {
                    const { x, y } = positionAt(o, a, (k / 16) * 40);
                    assert.ok(x >= 0 && x <= box.w, `x ${x.toFixed(0)} outside @${box.w}`);
                    assert.ok(y >= 0 && y <= box.h, `y ${y.toFixed(0)} outside @${box.w}`);
                }
            }
        }
    }
});

test("a narrow panel drops to two columns so labels cannot collide", () => {
    const wide = solve({ mode: "category" }, { w: NARROW_W + 1, h: 620 });
    const narrow = solve({ mode: "category" }, { w: NARROW_W - 1, h: 620 });
    const distinctX = (s: typeof wide) =>
        new Set(s.anchors.map((a) => Math.round(a.x))).size;
    assert.equal(distinctX(wide), 3);
    assert.equal(distinctX(narrow), 2);
});

test("category labels have room at every width", () => {
    /* ~7px per character at 11px mono, the widest label being the measure.
       Anchors closer together than that would overlap their own labels — the
       reason the two-column grid exists at all. */
    const widest = Math.max(...CATEGORIES.map((c) => c.label.length)) * 7;
    for (const box of PANELS) {
        const { anchors } = solve({ mode: "category" }, box);
        const cols = [...new Set(anchors.map((a) => Math.round(a.x)))].sort((a, b) => a - b);
        for (let i = 1; i < cols.length; i++) {
            assert.ok(
                cols[i] - cols[i - 1] >= widest * 0.62,
                `columns ${cols[i - 1]}→${cols[i]} too tight for labels @${box.w}`,
            );
        }
    }
});

test("orbits scale with the panel rather than being baked in px", () => {
    /* Compared WITHIN one grid regime. Doubling across the NARROW_W boundary
       also swaps 3 columns for 2, which legitimately changes the proportions
       — an earlier version of this test straddled it and read the grid change
       as a scaling bug. */
    const pairs: [Box, Box][] = [
        [{ w: 700, h: 434 }, { w: 1400, h: 868 }], // three columns
        [{ w: 300, h: 420 }, { w: 600, h: 840 }], // two columns
    ];

    for (const [small, large] of pairs) {
        const a = solve({ mode: "category" }, small).orbits[0].radius;
        const b = solve({ mode: "category" }, large).orbits[0].radius;
        assert.ok(b > a);
        /* A little MORE than 2×, and that is correct: the fit subtracts a
           fixed 20px of clearance between neighbouring systems, so on a bigger
           panel that constant eats a smaller share and the orbits keep
           proportionally more of the space. Asserting exactly 2× would be
           asserting that the gap between systems scales with the panel, which
           is not what a visual separation in pixels should do. */
        const ratio = b / a;
        assert.ok(
            ratio >= 2 && ratio < 2.3,
            `expected 2–2.3× at ${small.w}→${large.w}, got ${ratio.toFixed(3)}`,
        );
    }
});

/* ── Legibility ────────────────────────────────────────
   The suite above proves bodies stay inside the panel; it said nothing about
   whether they are far enough apart to read, which was the actual defect.
   These are the guards for that.

   A "ring" is every body sharing one anchor and one radius. The gap between
   neighbours on it is 2πr / n. */

interface Ring {
    anchorId: string;
    radius: number;
    count: number;
    lit: boolean;
}

function rings(s: Solution, litOnly = true): Ring[] {
    const by = new Map<string, Ring>();
    for (const o of s.orbits) {
        if (litOnly && !o.lit) continue;
        const key = `${o.anchorId}:${o.radius.toFixed(3)}`;
        const found = by.get(key);
        if (found) found.count++;
        else
            by.set(key, {
                anchorId: o.anchorId,
                radius: o.radius,
                count: 1,
                lit: o.lit,
            });
    }
    return [...by.values()];
}

const spacing = (r: Ring) => (2 * Math.PI * r.radius) / r.count;

test("the ring split follows circumference, not body count", () => {
    // 8 bodies: the inner ring has 62% of the outer's circumference, so it
    // takes ~38% of them. The original ceil(n*0.6) gave [5,3] — backwards.
    assert.deepEqual(ringSizes(8), [3, 5]);
    for (let n = 6; n <= 12; n++) {
        const [inner, outer] = ringSizes(n);
        assert.ok(inner >= 1, `empty inner ring at ${n}`);
        assert.ok(outer > inner, `inner ring is the crowded one at ${n}`);
    }
});

test("demand tracks the ring that actually constrains the radius", () => {
    assert.equal(demand(3), 3);
    assert.equal(demand(4), 4);
    assert.equal(demand(8), 5); // max(3/0.62, 5) = 5
    assert.ok(demand(8) > demand(4), "the 8-body system must ask for more room");
});

test("spacing between bodies is uniform across every system", () => {
    for (const box of PANELS) {
        const s = solve({ mode: "category" }, box);
        const all = rings(s).map(spacing);
        const min = Math.min(...all);
        const max = Math.max(...all);
        assert.ok(
            max / min <= 1.15,
            `spacing spread ${(max / min).toFixed(2)}× at ${box.w}px ` +
                `(${min.toFixed(0)}–${max.toFixed(0)}px) — a system is crowded`,
        );
    }
});

test("no system is crowded at any panel width", () => {
    /* 56px is roughly where 3px bodies stop reading as separate objects and
       start reading as texture. Machine Learning's inner ring sat at 59.8px
       before this pass while everything else had 120–161px. */
    for (const box of PANELS) {
        for (const r of rings(solve({ mode: "category" }, box))) {
            assert.ok(
                spacing(r) >= 56,
                `${r.anchorId} ring at ${spacing(r).toFixed(0)}px @${box.w}px`,
            );
        }
    }
});

test("the biggest system is visibly bigger than the smallest", () => {
    const s = solve({ mode: "category" }, BOX);
    const byId = new Map(s.anchors.map((a) => [a.id, a.radius]));
    assert.ok(byId.get("ml")! > byId.get("data")!, "ML should outgrow Data");
    // Machine Learning holds 8 skills, Data holds 3.
    assert.ok(
        byId.get("ml")! / byId.get("data")! > 1.4,
        "the size difference should be legible, not incidental",
    );
});

test("no orbit is drawn inside its own star's glow", () => {
    /* The specific defect: a fixed 46px glow against an inner ring at 47.6px
       meant the busiest system's inner orbit was rendered inside the halo.
       Invisible to every other test here. */
    const modes = [
        { mode: "category" } as const,
        ...PROJECTS.map((p) => ({ mode: "project" as const, projectId: p.id })),
    ];
    for (const box of PANELS) {
        for (const m of modes) {
            const s = solve(m, box);
            const byId = new Map(s.anchors.map((a) => [a.id, a]));
            for (const r of rings(s, false)) {
                const glow = glowRadius(byId.get(r.anchorId)!.radius);
                assert.ok(
                    r.radius > glow,
                    `${r.anchorId} ring r=${r.radius.toFixed(0)} inside glow ` +
                        `${glow.toFixed(0)} @${box.w}px`,
                );
            }
        }
    }
});

test("the project view's cold ring stays readable too", () => {
    // Up to 21 dimmed bodies by design, so a looser floor than a lit system.
    for (const box of PANELS) {
        for (const p of PROJECTS) {
            const s = solve({ mode: "project", projectId: p.id }, box);
            const cold = rings(s, false).filter((r) => !r.lit);
            for (const r of cold) {
                assert.ok(
                    spacing(r) >= 26,
                    `${p.label} cold ring at ${spacing(r).toFixed(0)}px @${box.w}px`,
                );
            }
        }
    }
});

test("inner bodies lead outer ones", () => {
    const { orbits } = solve({ mode: "category" }, BOX);
    const ml = orbits.filter((o) => SKILLS[o.skill].category === "ml");
    const inner = ml.find((o) => o.radius === Math.min(...ml.map((x) => x.radius)))!;
    const outer = ml.find((o) => o.radius === Math.max(...ml.map((x) => x.radius)))!;
    assert.ok(
        Math.abs(inner.speed) > Math.abs(outer.speed),
        "inner ring should be faster",
    );
});
