import type Lenis from "lenis";
/* Explicit `./scroll.ts`, NOT `@/lib/scroll`. This module is in
   lib/lenis.test.ts's own import graph, and Node's ESM resolver — which is
   what runs the tests — cannot resolve the `@/` alias or an extensionless
   specifier. CLAUDE.md's Commands section says not to "fix" these. */
import { JUMP_DURATION, JUMP_EASING } from "./scroll.ts";

/* ══════════════════════════════════════════════════════
   Lenis access + scroll locking

   A module singleton rather than context: every consumer
   needs the instance inside an event handler or effect,
   never during render, and two of them are loaded with
   dynamic({ ssr: false }). Context would buy nothing and
   cost a re-render.
   ══════════════════════════════════════════════════════ */

let instance: Lenis | null = null;
let lockCount = 0;

/**
 * Set by ScrollProvider on mount/unmount. Not for general use.
 *
 * A LOCK TAKEN BEFORE LENIS EXISTED IS STILL A LOCK, and this used to throw it
 * away — `lockCount = 0` on every registration.
 *
 * That is an ordering race with one guaranteed loser. ScrollProvider registers
 * from inside the gsap ticker, which first runs on the next animation frame,
 * and mount effects run before that frame. So the signal gate — which mounts
 * with the page and locks immediately — ALWAYS called `lockScroll()` against a
 * null instance, and this line then cleared the count it had just taken.
 *
 * The consequence was not the obvious one. `overflow: hidden` was still on the
 * root, so the scrollbar was gone and the wheel did nothing; but Lenis was
 * never stopped, and Lenis scrolls the window PROGRAMMATICALLY from the
 * ticker, which no overflow rule can prevent. The entrance looked locked and
 * the page underneath moved anyway, so pressing ENTER revealed the site
 * wherever the reader had got to.
 *
 * Unregistering still resets — that is a teardown, and the count belongs to
 * the instance that is going away.
 */
export function registerLenis(next: Lenis | null): void {
    instance = next;

    if (!next) {
        lockCount = 0;
        return;
    }
    if (lockCount > 0) next.stop();
}

export function getLenis(): Lenis | null {
    return instance;
}

/**
 * Reference-counted scroll lock.
 *
 * Counting is required, not defensive: choosing "Initialize System Stress
 * Test" in the command palette closes the palette (unlock) and opens the
 * game modal (lock) in overlapping effects. A naive stop()/start() pair
 * leaves the page either permanently locked or scrollable behind the modal,
 * depending on which effect runs last.
 */
export function lockScroll(): void {
    lockCount += 1;
    if (lockCount === 1) instance?.stop();
}

export function unlockScroll(): void {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) instance?.start();
}

/**
 * Scroll to a section by id.
 *
 * `force` makes the scroll execute even while Lenis is stopped, which is
 * what lets the command palette scroll during its own close transition
 * instead of having the request silently dropped.
 *
 * ── THE CURVE IS PASSED EXPLICITLY, AND HAS TO BE ──
 * Without these two options Lenis fills them from the instance, which is the
 * WHEEL's tuning: 1.8s of ease-out expo, a curve that opens at ~6.9x its own
 * average speed. Over a section-to-section flight that is ~930px in a single
 * frame, and the page's scroll-linked systems render it as one jolt. See the
 * note above JUMP_EASING in lib/scroll.ts.
 *
 * components/ScrollProvider.tsx passes the SAME pair to Lenis's `anchors`, so
 * the nav rail and the command palette move identically. They must stay in
 * step; two ways of reaching the same section that feel different is worse
 * than either one being slightly wrong.
 */
export function scrollToSection(id: string, force = true): void {
    const el = document.getElementById(id);
    if (!el) return;

    if (!instance) {
        el.scrollIntoView({ behavior: "auto" });
        return;
    }
    instance.scrollTo(el, {
        force,
        duration: JUMP_DURATION,
        easing: JUMP_EASING,
    });
}
