/* ══════════════════════════════════════════════════════
   The field's physics

   Blocks that push each other apart and get out of the way
   when you move the pointer at them.

   ── Why this is its own module ──
   The same split that already works in components/SkillOrbit:
   `flight.ts` holds the rules and is provable, `engine.ts`
   owns the mutable state and the canvas and is not. This is
   the `flight.ts` of the entrance — every decision that can
   go wrong lives here, where node can check it frame by
   frame, and the component is left with a draw call.

   That matters more than usual because a repulsion field has
   three classic failure modes and ALL THREE are invisible in
   code review:

     · it gains energy and the blocks eventually fly;
     · it loses energy, settles into equilibrium, and the
       screen quietly becomes a still image;
     · two bodies land exactly on top of each other, the
       direction is 0/0, and everything becomes NaN.

   There is a test for each.

   ── UNITS ──
   Positions are in multiples of `min(viewportWidth, height)`,
   measured from the centre of the screen. Not pixels, and not
   viewport FRACTIONS: fractions are anisotropic, so "touching"
   would mean a different distance horizontally than
   vertically and the repulsion would be egg-shaped. One
   isotropic unit for everything means a circle is a circle.
   ══════════════════════════════════════════════════════ */

export interface Body {
    /** Position, in min(w, h) units from the centre. */
    x: number;
    y: number;
    /** Velocity, units per second. */
    vx: number;
    vy: number;
    /**
     * Collision radius, same units. Set by the CALLER each frame from the
     * body's projected extent, because it depends on depth and this module
     * knows nothing about projection — a near block is bigger and so pushes
     * from further out.
     */
    r: number;
    /** Wander phases, so no two blocks drift on the same path. */
    wx: number;
    wy: number;
}

export interface Env {
    /** Half-extents of the viewport, in the same units. */
    halfX: number;
    halfY: number;
    /** Keep-out ellipse semi-axes: the copy's exclusion zone. */
    keepX: number;
    keepY: number;
    /** Pointer position in the same units, or null when it is not over us. */
    pointer: { x: number; y: number } | null;
}

/* ── Constants ─────────────────────────────────────────
   Tuned for a calm room. This is an entrance someone reads for a few seconds,
   not a toy they play with for a minute, so the blocks ease apart rather than
   ping off each other. */

/** Repulsion begins at this multiple of the two radii summed. */
export const REPEL_RANGE = 1.45;

/** Peak repulsion acceleration, units/s², reached at full overlap. */
export const REPEL_ACCEL = 0.5;

/** How far the pointer's influence reaches. ~0.25 × the short edge. */
export const POINTER_RADIUS = 0.25;

/** Peak pointer acceleration, units/s². Stronger than a neighbour: it is you. */
export const POINTER_ACCEL = 0.95;

/** Velocity retained per second. Heavy damping is what keeps the room calm. */
export const DAMP = 0.35;

/** Nothing moves faster than this, whatever the forces say. Units/s. */
export const MAX_SPEED = 0.35;

/** Ambient acceleration, units/s². THE FIELD WOULD OTHERWISE CONVERGE. */
export const WANDER_ACCEL = 0.035;

/** How quickly the wander direction turns. Slow — this is a drift, not a jitter. */
export const WANDER_RATE = 0.17;

/** How far past the frame edge a block's CENTRE may sit. */
export const OVERHANG = 0.05;

/** Band inside the frame edge where the wall starts pushing back. */
export const WALL_SOFT = 0.08;

/** Softening band outside the keep-out ellipse where the copy starts pushing. */
export const KEEP_SOFT = 0.16;

/**
 * Largest integration step, seconds.
 *
 * A backgrounded tab hands back a `dt` of whatever the reader was away for. At
 * 30 seconds every body integrates half a minute of acceleration in one go and
 * the field detonates. Same clamp, same value, as SkillOrbit's engine.
 */
export const MAX_DT = 0.05;

/** Below this separation the direction is 0/0. See `pairAccel`. */
const EPS = 1e-6;

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;

/**
 * Acceleration on body A from body B.
 *
 * Zero beyond `REPEL_RANGE × (ra + rb)`, rising smoothly to `REPEL_ACCEL` at
 * full overlap. Squared falloff rather than linear so neighbours that are
 * merely near barely feel each other and only real contact pushes.
 *
 * NOTHING IS EVER PULLED. This is a one-sided force: the sign never flips, so
 * the field cannot collapse into clumps however the constants are retuned.
 */
export function pairAccel(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    ra: number,
    rb: number,
): { ax: number; ay: number } {
    const dx = ax - bx;
    const dy = ay - by;
    const reach = (ra + rb) * REPEL_RANGE;
    const d = Math.hypot(dx, dy);

    if (d >= reach || reach <= 0) return { ax: 0, ay: 0 };

    /* Exactly coincident. The direction is undefined, so pick a fixed one —
       A goes right, B goes left. Deterministic and NaN-free, which is the only
       thing that matters in a case that should never happen. */
    if (d < EPS) return { ax: REPEL_ACCEL, ay: 0 };

    const falloff = 1 - d / reach;
    const mag = REPEL_ACCEL * falloff * falloff;

    return { ax: (dx / d) * mag, ay: (dy / d) * mag };
}

/**
 * Acceleration on a body from the pointer.
 *
 * Always AWAY. The blocks scatter from the cursor rather than following it,
 * which is what makes the screen feel like it is made of objects rather than
 * of a cursor-follower effect.
 */
export function pointerAccel(
    bx: number,
    by: number,
    px: number,
    py: number,
): { ax: number; ay: number } {
    const dx = bx - px;
    const dy = by - py;
    const d = Math.hypot(dx, dy);

    if (d >= POINTER_RADIUS) return { ax: 0, ay: 0 };
    if (d < EPS) return { ax: POINTER_ACCEL, ay: 0 };

    const falloff = 1 - d / POINTER_RADIUS;
    const mag = POINTER_ACCEL * falloff * falloff;

    return { ax: (dx / d) * mag, ay: (dy / d) * mag };
}

/** How far inside the keep-out ellipse a point is. 1 is exactly on it. */
export function keepDepth(x: number, y: number, keepX: number, keepY: number): number {
    return Math.hypot(x / keepX, y / keepY);
}

/**
 * Push a body out of the copy's exclusion zone, and stop it heading back in.
 *
 * THIS IS THE HARD GUARANTEE, and it replaces one the field used to get for
 * free. The old version put every block on a fixed ring around the copy, so
 * "nothing is ever drawn on the text" was true by construction. Bodies that
 * move under forces have no such property, so it is enforced here instead:
 * the position is projected back onto the ellipse and the inward component of
 * the velocity is removed, every frame, for every body.
 *
 * A soft push starts before the boundary (`KEEP_SOFT`) so blocks ease away
 * rather than striking an invisible wall — but the projection is what makes
 * the promise, not the push.
 */
export function projectOut(b: Body, keepX: number, keepY: number): void {
    const k = keepDepth(b.x, b.y, keepX, keepY);
    if (k >= 1) return;

    if (k < EPS) {
        // Dead centre. Any direction is as good as any other; take +x.
        b.x = keepX;
        b.y = 0;
        b.vx = Math.max(0, b.vx);
        return;
    }

    // Scale onto the boundary along the ray from the centre.
    b.x /= k;
    b.y /= k;

    /* Outward normal of the ellipse at this point — the gradient of
       (x/kx)² + (y/ky)², not the radial direction, which is not perpendicular
       to an ellipse anywhere but on its axes. */
    let nx = b.x / (keepX * keepX);
    let ny = b.y / (keepY * keepY);
    const n = Math.hypot(nx, ny);
    if (n < EPS) return;
    nx /= n;
    ny /= n;

    const into = b.vx * nx + b.vy * ny;
    if (into < 0) {
        b.vx -= into * nx;
        b.vy -= into * ny;
    }
}

/**
 * Advance the whole field by `dt` seconds.
 *
 * MUTATES `bodies`, deliberately — this runs every frame for the life of the
 * screen and allocating a new array each time is the one thing here that would
 * actually show up. The same choice SkillOrbit's engine makes, for the same
 * reason. It stays testable because it is otherwise deterministic: the same
 * bodies and the same `t` give the same result.
 *
 * `t` is absolute seconds, used only by the wander.
 */
export function stepField(
    bodies: Body[],
    dt: number,
    t: number,
    env: Env,
): void {
    const h = clamp(dt, 0, MAX_DT);
    if (h <= 0) return;

    const { halfX, halfY, keepX, keepY, pointer } = env;

    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        let ax = 0;
        let ay = 0;

        // Neighbours.
        for (let j = 0; j < bodies.length; j++) {
            if (j === i) continue;
            const o = bodies[j];
            const f = pairAccel(b.x, b.y, o.x, o.y, b.r, o.r);
            ax += f.ax;
            ay += f.ay;
        }

        // The pointer.
        if (pointer) {
            const f = pointerAccel(b.x, b.y, pointer.x, pointer.y);
            ax += f.ax;
            ay += f.ay;
        }

        /* The copy, as a soft repeller. The projection below is what actually
           guarantees the keep-out; this only makes arriving at it gentle. */
        const k = keepDepth(b.x, b.y, keepX, keepY);
        if (k < 1 + KEEP_SOFT) {
            const push = (1 + KEEP_SOFT - k) / KEEP_SOFT;
            const d = Math.hypot(b.x, b.y);
            if (d > EPS) {
                ax += (b.x / d) * REPEL_ACCEL * push;
                ay += (b.y / d) * REPEL_ACCEL * push;
            }
        }

        // Soft walls, so the frame edges behave like the copy does.
        const overX = Math.abs(b.x) - (halfX - WALL_SOFT);
        if (overX > 0) ax -= Math.sign(b.x) * REPEL_ACCEL * (overX / WALL_SOFT);
        const overY = Math.abs(b.y) - (halfY - WALL_SOFT);
        if (overY > 0) ay -= Math.sign(b.y) * REPEL_ACCEL * (overY / WALL_SOFT);

        /* THE WANDER, and without it this whole field is a still image. A
           damped repulsion system converges: every body finds the spot where
           the pushes cancel, stops, and stays there. Two slow sines per body
           mean the equilibrium is always moving, so nothing ever arrives. */
        ax += Math.sin(t * WANDER_RATE + b.wx) * WANDER_ACCEL;
        ay += Math.cos(t * WANDER_RATE * 0.83 + b.wy) * WANDER_ACCEL;

        b.vx += ax * h;
        b.vy += ay * h;

        // Damping, frame-rate independent.
        const decay = Math.pow(DAMP, h);
        b.vx *= decay;
        b.vy *= decay;

        // Speed ceiling. The last line of defence against a runaway.
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > MAX_SPEED) {
            const s = MAX_SPEED / speed;
            b.vx *= s;
            b.vy *= s;
        }

        b.x += b.vx * h;
        b.y += b.vy * h;

        /* Hard constraints, and THE ORDER IS DELIBERATE: the frame clamp first,
           the keep-out projection last. The frame clamp only ever moves a body
           inward, so running it after the projection could in principle push
           one back onto the copy; running it before cannot, because the
           projection only moves bodies outward and the ellipse sits well
           inside the frame. Whichever runs last is the one that holds, so the
           one that holds is the promise about the text. */
        b.x = clamp(b.x, -(halfX + OVERHANG), halfX + OVERHANG);
        b.y = clamp(b.y, -(halfY + OVERHANG), halfY + OVERHANG);
        projectOut(b, keepX, keepY);
    }
}
