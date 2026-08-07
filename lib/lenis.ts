import type Lenis from "lenis";

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

/** Set by ScrollProvider on mount/unmount. Not for general use. */
export function registerLenis(next: Lenis | null): void {
    instance = next;
    lockCount = 0;
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
 */
export function scrollToSection(id: string, force = true): void {
    const el = document.getElementById(id);
    if (!el) return;

    if (!instance) {
        el.scrollIntoView({ behavior: "auto" });
        return;
    }
    instance.scrollTo(el, { force });
}
