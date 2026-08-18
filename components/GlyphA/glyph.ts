/* ══════════════════════════════════════════════════════
   The A

   Where the entrance's 27 fragments go after they burst,
   and what they turn into on the way down the page.

   The gate's finale used to end with the debris fading to
   nothing. The fragments are the best material on the site
   and they were being thrown away — so they now fly out,
   turn, and build a letter standing exactly where the atlas
   core will be. Scroll the hero and the letter comes apart
   again into the atlas's own core and branch endpoints.

   ── Why this is a module of its own ──
   The same split `SkillOrbit` and `SignalGate` already use:
   the rules are arithmetic, so node can check them frame by
   frame, and the component is left holding a canvas and a
   pointer. Every constant that could ruin something lives
   on this side.

   It matters here for a specific reason. NONE of this is
   watchable in the dev environment — the browser pane never
   composites, so rAF is paused and no animation runs. A
   convergence that lands a few pixels short, a rotation that
   flips the letter inside out, a repulsion field that
   quietly gains energy: all invisible in review, all
   trivially assertable.

   ── One camera, one rect ──
   Everything here is expressed in `SignalGate/cubes.ts`'s
   world space and drawn with its `project`. The glyph canvas
   and `.signal-gate-cubes` are the SAME rect — both fixed,
   full viewport, origin (0,0) — so a pose the gate was
   drawing at the burst is the identical pose here with no
   transform between them. That is what makes the handover
   seamless rather than merely well timed.
   ══════════════════════════════════════════════════════ */

/* Explicit `.ts` extensions throughout: this module is in a test's own graph
   and Node's ESM resolver has no extension guessing. The atlas half resolves
   too — `stages.ts` already imports `./config.ts` with an extension and
   `config.ts` imports nothing at all. */
import { FOV, NEAR, type Pose, type Pt2 } from "../SignalGate/cubes.ts";
import {
    AXIS_CELLS,
    MERGE_SIZE,
    debrisAt,
    easeInOut,
    easeOut,
    type Fragment,
} from "../SignalGate/finale.ts";
import {
    CORE_POSITIONS,
    LENGTH_SCALE,
    type BreakpointMode,
} from "../LivingArchitecture/config.ts";
import { STAGES } from "../LivingArchitecture/stages.ts";

/* ── The letter ────────────────────────────────────────

   Eight rows, five columns, drawn rather than described. A
   voxel letterform is very easy to get subtly wrong and
   completely impossible to notice in a diff — as art it is
   checkable at a glance, and the test asserts the shape it
   parses to.

   ── Two things this art is fixing ──
   The first version tapered the whole upper half inward to
   columns 1 and 3. Rendered, the full-width crossbar then
   jutted out on both sides like a shelf and the thing read
   as a stool with a back, not as a letter. THE SIDES RUN
   STRAIGHT; only the apex closes over.

   And the apex closes over THROUGH row 1, which is what
   `##.##` is for. A `.###.` sitting directly on `#...#`
   touches only at the diagonals — and a solid is 6-connected,
   not 8-connected, so the top bar would have been a separate
   floating object. It looks joined in a bitmap and comes
   apart the moment the letter turns.

   Flat-topped rather than pointed. A pointed apex at this
   resolution is one cube balanced on a corner, which reads
   as a bug; the flat top also suits a site whose whole type
   language is geometric. */
const ART = [
    ".###.",
    "##.##",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
] as const;

export const LETTER_COLS = 5;
export const LETTER_ROWS = 8;

/** Row index of the crossbar. The one row that is two cells deep. */
export const CROSSBAR_ROW = 4;

export interface Cell {
    /** 0…LETTER_COLS-1, left to right. */
    readonly cx: number;
    /** 0…LETTER_ROWS-1, TOP DOWN — art order, not world order. */
    readonly cy: number;
    /** 0 = front, 1 = back. Only the crossbar has both. */
    readonly cz: number;
}

/**
 * The 27 cells, and it is 27 on purpose.
 *
 * `shatter()` cuts the merged cube into exactly `FRAGMENT_COUNT` pieces, and
 * every piece gets one slot here — so the thing that flies out of the
 * explosion is the thing that builds the letter, one for one, with nothing
 * spawned and nothing discarded. `LETTER_CELLS.length === FRAGMENT_COUNT` is
 * asserted, because the two numbers now have to move together and neither
 * file mentions the other.
 *
 * 22 cells of flat letterform plus the crossbar repeated at `cz = 1`. The
 * crossbar is where the two strokes cross, so it is the one place depth reads
 * as structure rather than as an arbitrary bulge — and it is what stops the
 * letter looking like a decal when it turns.
 */
export const LETTER_CELLS: readonly Cell[] = (() => {
    const out: Cell[] = [];
    for (let cy = 0; cy < ART.length; cy++) {
        for (let cx = 0; cx < ART[cy].length; cx++) {
            if (ART[cy][cx] !== "#") continue;
            out.push({ cx, cy, cz: 0 });
            if (cy === CROSSBAR_ROW) out.push({ cx, cy, cz: 1 });
        }
    }
    return out;
})();

/* ── Scale and placement ───────────────────────────────

   The letter's height as a fraction of the viewport's SHORT edge, and the
   depth plane it stands on.

   `pitchFor` needs neither width nor height, which is not a coincidence: the
   projection scales by `min(w, h)` and so does the target size, so they
   cancel. One number covers every viewport. */

/** Letter height as a fraction of the short edge. */
export const LETTER_FRAC = 0.42;

/** Depth the letter stands at. Behind the merge plane, so it settles away
    from the camera rather than looming into it. */
export const LETTER_Z = 4.0;

/**
 * How much of a cell's pitch the cube actually fills.
 *
 * Below 1 so the letter reads as built out of blocks rather than poured, but
 * not far below: at 0.42 the gaps were wider than the seams and each stroke
 * read as a dotted line rather than a stroke. Half the pitch is a cube whose
 * silhouette very nearly meets its neighbour's.
 */
const FILL = 0.52;

/** Spacing between cell centres, in world units. */
export function pitchFor(z: number = LETTER_Z): number {
    return (LETTER_FRAC * z) / ((LETTER_ROWS - 1) * FOV);
}

/** Half-extent of one letter cube, in world units. */
export function cellSizeFor(z: number = LETTER_Z): number {
    return pitchFor(z) * FILL;
}

export interface Vec2 {
    readonly x: number;
    readonly y: number;
}

/**
 * World-space position of a screen point at a given depth.
 *
 * The inverse of `project`'s final step. Note the Y flip — world Y is up and
 * the canvas' is down, and getting that backwards on a roughly centred letter
 * looks almost right, which is the worst kind of wrong.
 */
export function anchorWorld(
    sx: number,
    sy: number,
    z: number,
    w: number,
    h: number,
): Vec2 {
    const k = z / (Math.min(w, h) * FOV);
    return { x: (sx - w / 2) * k, y: (h / 2 - sy) * k };
}

/**
 * Where cell `i` sits when the letter is anchored at `anchor` and turned to
 * `(rx, ry)`.
 *
 * THE LETTER IS A RIGID BODY. Each cell's offset is rotated about the
 * letter's own centre by the same angles the cube itself is drawn at, so the
 * faces stay aligned with their neighbours as the whole thing turns. Rotating
 * the cubes without rotating their positions gives 27 cubes spinning inside a
 * static letter, which is a much odder thing to look at than it sounds.
 *
 * Rotation is Y then X — the SAME order as `project`. The two are not
 * interchangeable and a mismatch here would shear the letter against its own
 * faces.
 */
export function slotPose(
    i: number,
    anchor: Vec2,
    rx: number,
    ry: number,
    z: number = LETTER_Z,
): Pose {
    const c = LETTER_CELLS[i];
    const pitch = pitchFor(z);

    const ox = (c.cx - (LETTER_COLS - 1) / 2) * pitch;
    // Art rows run top-down; world Y runs up.
    const oy = ((LETTER_ROWS - 1) / 2 - c.cy) * pitch;
    const oz = (c.cz - 0.5) * pitch;

    const cy2 = Math.cos(ry);
    const sy2 = Math.sin(ry);
    const x1 = ox * cy2 + oz * sy2;
    const z1 = -ox * sy2 + oz * cy2;

    const cx2 = Math.cos(rx);
    const sx2 = Math.sin(rx);
    const y2 = oy * cx2 - z1 * sx2;
    const z2 = oy * sx2 + z1 * cx2;

    return {
        x: anchor.x + x1,
        y: anchor.y + y2,
        z: Math.max(NEAR * 0.9, z + z2),
        rx,
        ry,
        size: cellSizeFor(z),
    };
}

/* ── The flight ────────────────────────────────────────

   Out, turn, home. One function across the whole arc rather than a burst
   handed to an assembly, because a handover between two functions is a seam
   and this is the one gesture on the site that must not have one.

   It starts at `debrisAt(f, 0)` — the intact merged cube — which is exactly
   the pose the gate's canvas was drawing at the instant it stopped. That is
   the continuity: not a matched timing, the same arithmetic. */

/** Fraction of the arc spent flying outward before the turn. */
export const FLY_OUT = 0.42;

/**
 * How long the whole flight takes.
 *
 * Longer than the 900ms burst it continues, because this one has to cover the
 * distance twice and land precisely. It is also the number that decides how
 * much of Hero's entrance the letter is still arriving over — Hero's own
 * timeline runs about two seconds from the same instant, so the two finish
 * within a few hundred milliseconds of each other and the page and its mark
 * settle together.
 */
export const ASSEMBLE_MS = 1700;

/** How much of `debrisAt`'s reach the outward leg covers. Shorter, because
    these pieces are coming back — a full burst throws them so far that the
    return is a long dull drift across an empty screen. */
const OUT_REACH = 0.62;

/**
 * How much a piece shrinks on the way out.
 *
 * NOT COSMETIC — it is what keeps a piece thrown toward the camera under the
 * looming ceiling `finale.test.ts` already defends, and the test here caught
 * it: holding the size constant while depth drops sends `size / z` to 0.088
 * against a 0.074 limit, and the piece fills a third of the frame on its way
 * past. `debrisAt` avoids it by shrinking on the same eased curve as the
 * travel, so a piece's size and its distance stay in step. Same fix.
 *
 * It is also the honest shape: the letter's cubes are less than half a
 * fragment's size, so the shrink has to happen somewhere. Starting it on the
 * way out means the return is a settle rather than a collapse.
 */
const OUT_SHRINK = 0.45;

export interface Drawn {
    readonly pose: Pose;
    /** 0…1. */
    readonly alpha: number;
}

/**
 * A fragment on its way to being part of the letter.
 *
 * `u` runs 0…1 across the whole flight. At `u = 1` the returned pose is
 * EXACTLY `slot` — position, depth, both angles and size. There is a test,
 * for the same reason `finale.test.ts` asserts the convergence identity:
 * "nearly right" shows up as a letter whose blocks do not quite line up,
 * which reads as a rendering fault rather than as a design.
 *
 * Alpha is 1 throughout. These are arriving, not leaving; a fade-in here
 * would mean the merged cube dimmed at the exact moment it came apart.
 */
export function flyAt(f: Fragment, slot: Pose, u: number): Drawn {
    const p = u < 0 ? 0 : u > 1 ? 1 : u;

    if (p <= FLY_OUT) {
        const out = easeOut(p / FLY_OUT);
        const travel = out * f.reach * OUT_REACH;
        const cell = MERGE_SIZE / AXIS_CELLS;
        const base = debrisAt(f, 0).pose;

        return {
            pose: {
                x: base.x + f.dx * travel * MERGE_SIZE,
                y: base.y + f.dy * travel * MERGE_SIZE,
                z: Math.max(NEAR * 0.9, base.z + f.dz * travel * MERGE_SIZE),
                rx: f.rx0 + f.srx * p,
                ry: f.ry0 + f.sry * p,
                size: cell * (1 - OUT_SHRINK * out),
            },
            alpha: 1,
        };
    }

    /* The return. Eased in and out, so the turn is a curve rather than a
       bounce off an invisible wall, and so the piece arrives slowly enough
       to read as settling into place. */
    const turn = flyAt(f, slot, FLY_OUT).pose;
    const e = easeInOut((p - FLY_OUT) / (1 - FLY_OUT));
    const mix = (a: number, b: number) => a + (b - a) * e;

    return {
        pose: {
            x: mix(turn.x, slot.x),
            y: mix(turn.y, slot.y),
            z: Math.max(NEAR * 0.9, mix(turn.z, slot.z)),
            rx: mix(turn.rx, slot.rx),
            ry: mix(turn.ry, slot.ry),
            size: mix(turn.size, slot.size),
        },
        alpha: 1,
    };
}

/* ── The morph ─────────────────────────────────────────

   The letter coming apart into the atlas. Each cube travels to a real atlas
   anchor — the core, or one of stage 1's branch endpoints — shrinking and
   fading as it arrives, so what the reader sees is the letter turning into
   the diagram rather than one thing leaving while another shows up. */

/** Fraction of the morph at full opacity before the fade starts. */
const MORPH_HOLD = 0.45;

/** How small a cube gets on the way in. It is becoming a node, not landing
    as a block on top of one. */
const MORPH_SHRINK = 0.22;

/**
 * A cube part way to its atlas anchor. `p` runs 0…1 across the morph window.
 *
 * `slot` is the cube's live pose this frame, so the letter can still be
 * turning as it leaves. Distance to the target is monotonically decreasing
 * for a fixed slot — asserted — which is what stops the morph reading as a
 * scatter that happens to end in the right place.
 */
export function morphAt(slot: Pose, target: Pose, p: number): Drawn {
    const c = p < 0 ? 0 : p > 1 ? 1 : p;
    const e = easeInOut(c);
    const mix = (a: number, b: number) => a + (b - a) * e;

    const fade = c <= MORPH_HOLD ? 1 : 1 - (c - MORPH_HOLD) / (1 - MORPH_HOLD);

    return {
        pose: {
            x: mix(slot.x, target.x),
            y: mix(slot.y, target.y),
            z: Math.max(NEAR * 0.9, mix(slot.z, target.z)),
            rx: mix(slot.rx, target.rx),
            ry: mix(slot.ry, target.ry),
            size: slot.size * (1 - (1 - MORPH_SHRINK) * e),
        },
        alpha: fade < 0 ? 0 : fade,
    };
}

/**
 * Where the atlas will be: its core, plus stage 1's branch endpoints.
 *
 * DERIVED FROM THE ATLAS'S OWN CONFIG rather than copied, so the letter
 * cannot come apart onto points the atlas has stopped drawing. Stage 1 rather
 * than stage 0 because stage 0 is very nearly nothing — one 120px stub and
 * two ghosts — and by the time the cubes land the reader is already scrolling
 * into stage 1.
 *
 * `baseAngle` is the atlas's own convention: 0 is right, PI/2 is DOWN, so
 * these are screen coordinates and no Y flip belongs here.
 *
 * Clamped inside the viewport. A branch endpoint is allowed to run off the
 * edge — the atlas clips — but a cube flying to one would spend the morph
 * travelling somewhere nobody can see.
 */
export function atlasTargets(
    w: number,
    h: number,
    mode: BreakpointMode,
): Vec2[] {
    const core = CORE_POSITIONS[mode];
    const scale = LENGTH_SCALE[mode];
    const cx = core.x * w;
    const cy = core.y * h;

    const clamp = (v: number, lo: number, hi: number) =>
        v < lo ? lo : v > hi ? hi : v;

    return [
        { x: cx, y: cy },
        ...STAGES[1].branches.map((b) => ({
            x: clamp(cx + Math.cos(b.baseAngle) * b.length * scale, w * 0.04, w * 0.96),
            y: clamp(cy + Math.sin(b.baseAngle) * b.length * scale, h * 0.04, h * 0.96),
        })),
    ];
}

/** Which anchor cube `i` goes to. Round robin, so every target is used. */
export function targetForCell(i: number, targetCount: number): number {
    return i % targetCount;
}

/* ── Rotation ──────────────────────────────────────────

   Idle spin, drag, and the settle afterwards.

   A TIMER BRINGS THE SPIN TO REST, NOT FRICTION — the whole lesson of
   `flight.ts` next door, where a body decayed at 0.86 per second and solved
   to a 16-to-25 second trip home. Decay shapes the arc; a cap decides when it
   is over. */

export interface Spin {
    /** Tilt. Clamped: past the limit the letter turns inside out. */
    readonly rx: number;
    /**
     * Turn, as an OFFSET from the resting sway — not an absolute angle.
     * Drag moves it, and it eases back to zero so the letter always returns
     * to a pose it can be read in.
     */
    readonly ry: number;
    readonly vrx: number;
    readonly vry: number;
    /** Seconds since the last drag frame. */
    readonly freeT: number;
}

/** Resting tilt. Enough to show a top face, not enough to read as a tipped
    object. */
export const REST_RX = 0.3;

/** Hard clamp on tilt. THE LETTER CAN NEVER INVERT. */
export const RX_LIMIT = 0.62;

/* ── The resting motion is a SWAY, not a revolution ────

   A letter turning continuously passes edge-on twice a cycle, and edge-on it
   is not a letter — it is a slab. The stills made that obvious and nothing in
   the maths would have: at 0.7 radians the A is at its best, at 1.57 it has
   no counter, no crossbar and no legs.

   So at rest it turns back and forth through an angle it stays readable
   across. Drag still takes it anywhere the reader wants — this is only what
   it does when left alone, and what it comes back to. */

/** How far the resting sway turns each way, radians. Well short of edge-on. */
export const SWAY_AMP = 0.42;

/** Seconds for one full sway. Slow enough to read as breathing. */
export const SWAY_PERIOD = 11;

/** The resting turn at time `t`, in seconds. */
export function swayAt(t: number): number {
    return Math.sin((t / SWAY_PERIOD) * Math.PI * 2) * SWAY_AMP;
}

/** Radians per pixel of drag. */
export const DRAG_SENS = 0.0075;

/** Ceiling on release velocity, rad/s. `moveDrag` next door derives velocity
    from a raw pointer delta with no ceiling of its own and a flick produced
    1500 px/s; the same trap applies to an angle. */
export const MAX_SPIN = 4.5;

/** Velocity decay per second while free. */
const SPIN_DECAY = 0.14;

/** Hard cap on free spin after release. The timer, not the friction. */
export const SETTLE_S = 1.6;

/** How fast tilt returns to rest, as an exponential rate. */
const RX_HOME = 2.4;

/**
 * How fast the turn returns to the sway. Deliberately gentler than the tilt.
 *
 * It does return, and that is a decision: this letter is the site's mark, so
 * leaving it parked edge-on where a reader happened to let go would be a
 * worse default than easing it back. Slowly enough that it reads as the
 * object settling rather than as the page overriding the reader.
 */
const RY_HOME = 1.1;

export interface DragInput {
    /** Pointer delta since the last frame, in CSS pixels. */
    readonly dx: number;
    readonly dy: number;
}

export const SPIN_REST: Spin = {
    rx: REST_RX,
    ry: 0,
    vrx: 0,
    vry: 0,
    freeT: SETTLE_S,
};

const clampAbs = (v: number, lim: number) =>
    v < -lim ? -lim : v > lim ? lim : v;

/**
 * The letter's rotation one frame on.
 *
 * `dt` is clamped at 0.05, the same value the entrance field and SkillOrbit's
 * engine both use: rAF hands back the whole time a backgrounded tab was away,
 * and a thirty-second step integrated at once is a letter that has spun to a
 * completely arbitrary angle by the time anyone looks at it.
 */
export function spinAt(s: Spin, dtRaw: number, drag: DragInput | null): Spin {
    const dt = dtRaw < 0 ? 0 : dtRaw > 0.05 ? 0.05 : dtRaw;

    if (drag) {
        /* Velocity from the delta the drag actually moved, divided by real
           elapsed time — not a fixed multiplier. A 120Hz pointer and a 60Hz
           one produce the same launch from the same physical flick. */
        const vry = dt > 0 ? clampAbs((drag.dx * DRAG_SENS) / dt, MAX_SPIN) : 0;
        const vrx = dt > 0 ? clampAbs((drag.dy * DRAG_SENS) / dt, MAX_SPIN) : 0;

        return {
            rx: clampAbs(s.rx + drag.dy * DRAG_SENS, RX_LIMIT),
            ry: s.ry + drag.dx * DRAG_SENS,
            vrx,
            vry,
            freeT: 0,
        };
    }

    const freeT = s.freeT + dt;
    const spent = freeT >= SETTLE_S;
    const decay = Math.pow(SPIN_DECAY, dt);

    const vrx = spent ? 0 : s.vrx * decay;
    const vry = spent ? 0 : s.vry * decay;

    /* Both angles are pulled home every frame, so the letter always comes
       back to a readable pose whatever it was left at. Exponential, so it is
       frame-rate independent and never overshoots. */
    const tilted = clampAbs(s.rx + vrx * dt, RX_LIMIT);
    const turned = s.ry + vry * dt;
    const kx = 1 - Math.exp(-RX_HOME * dt);
    const ky = 1 - Math.exp(-RY_HOME * dt);

    return {
        rx: tilted + (REST_RX - tilted) * kx,
        ry: turned - turned * ky,
        vrx,
        vry,
        freeT,
    };
}

/* ── Repulsion ─────────────────────────────────────────

   Cubes shy away from the cursor and drift back. Screen space and screen
   pixels, because "near the cursor" is a screen fact — the component converts
   the offset back to world units at draw time, where it already knows the
   depth.

   Deliberately not a force field. `forces.ts` runs one for the entrance and
   the three ways it can fail — gaining energy, losing it, and two bodies
   landing on the same point — are all real. A bounded offset with an
   exponential return has none of them by construction, and the letter has to
   stay legible while it is being poked. */

/** How close the pointer has to be, in CSS pixels. */
export const REPEL_RADIUS = 190;

/** Furthest a cube is ever pushed, in CSS pixels. */
export const REPEL_MAX = 46;

/** Approach rate toward the shoved position, and back again. */
const REPEL_K = 9;
const RETURN_K = 3.4;

export const NO_OFFSET: Vec2 = { x: 0, y: 0 };

/**
 * A cube's pointer offset, one frame on.
 *
 * Bounded by construction — the desired offset never exceeds `REPEL_MAX` and
 * an exponential approach cannot overshoot it — so this can neither gain
 * energy nor need a speed ceiling.
 *
 * The coincident case is real and is the third of `forces.test.ts`'s three
 * failure modes: a cube whose screen position is exactly the pointer has no
 * direction, `hypot` is 0, and dividing by it makes every downstream number
 * NaN for the rest of the session. It gets a fixed direction instead.
 */
export function repelOffset(
    cur: Vec2,
    cell: Vec2,
    pointer: Vec2 | null,
    dtRaw: number,
): Vec2 {
    const dt = dtRaw < 0 ? 0 : dtRaw > 0.05 ? 0.05 : dtRaw;

    let wantX = 0;
    let wantY = 0;
    let rate = RETURN_K;

    if (pointer) {
        const dx = cell.x - pointer.x;
        const dy = cell.y - pointer.y;
        const d = Math.hypot(dx, dy);

        if (d < REPEL_RADIUS) {
            const [ux, uy] = d < 1e-6 ? [0.82, -0.57] : [dx / d, dy / d];
            const push = ((REPEL_RADIUS - d) / REPEL_RADIUS) * REPEL_MAX;
            wantX = ux * push;
            wantY = uy * push;
            rate = REPEL_K;
        }
    }

    const k = 1 - Math.exp(-rate * dt);
    return { x: cur.x + (wantX - cur.x) * k, y: cur.y + (wantY - cur.y) * k };
}

/**
 * Screen-pixel offset converted to world units at a given depth.
 *
 * The reverse of the scale `project` applies. Without it a push looks right
 * at the letter's front face and wrong everywhere else, because the same
 * world offset covers fewer pixels the further back a cube sits.
 */
export function offsetToWorld(off: Vec2, z: number, w: number, h: number): Vec2 {
    const k = z / (Math.min(w, h) * FOV);
    // Y flips: screen down, world up.
    return { x: off.x * k, y: -off.y * k };
}

/** Screen bounds of the letter, for the pointer hit box. */
export function letterBounds(
    poses: readonly Pose[],
    w: number,
    h: number,
): { x: number; y: number; w: number; h: number } {
    let lo = Infinity;
    let top = Infinity;
    let hi = -Infinity;
    let bot = -Infinity;

    for (const p of poses) {
        const scale = (Math.min(w, h) * FOV) / p.z;
        // A cube's silhouette reaches further than its face half-extent as it
        // turns; the same 1.35 span `collisionRadius` uses.
        const r = p.size * 1.35 * scale;
        const sx = w / 2 + p.x * scale;
        const sy = h / 2 - p.y * scale;
        if (sx - r < lo) lo = sx - r;
        if (sx + r > hi) hi = sx + r;
        if (sy - r < top) top = sy - r;
        if (sy + r > bot) bot = sy + r;
    }

    if (!Number.isFinite(lo)) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: lo, y: top, w: hi - lo, h: bot - top };
}

/** Screen point of a pose's centre. Used by the repulsion and the hit box. */
export function screenOf(pose: Pose, w: number, h: number): Pt2 {
    const scale = (Math.min(w, h) * FOV) / pose.z;
    return { x: w / 2 + pose.x * scale, y: h / 2 - pose.y * scale, z: pose.z };
}
