/* ══════════════════════════════════════════════════════
   The entrance gate

   One question, asked once per page load: may the page
   animate itself in yet?

   ── The problem it solves ──
   Every entrance on this site used to fire on mount.
   `Reveal` created its ScrollTriggers inside `useGSAP` and
   `Hero` started its character timeline as soon as
   `document.fonts.ready` resolved — 0.3s to 1.2s in. The
   signal gate's overlay is opaque and stays up for a full
   2000ms. So on any gated load, every animation the viewport
   contained had already run to completion behind it, and
   lifting the overlay uncovered a finished page. Reloading
   halfway down the site was worse: you were returned to your
   scroll position and the content was simply there.

   Nothing was waiting for scroll restoration either, so the
   triggers were evaluated against whatever position existed
   at mount rather than the one the reader actually lands on.

   So the rule is: NOTHING ANIMATES UNTIL THE PAGE IS
   VISIBLE AND SETTLED WHERE THE READER LEFT IT. After that,
   the elements in view run the site's ordinary reveal
   choreography, which is what makes the arrival read as
   scrolling into a section rather than as a cut.

   ── Why a module singleton ──
   Same shape and same reasoning as lib/lenis.ts: every
   consumer wants this inside an effect, never during render,
   and the participants are scattered across the tree with no
   props path between them. Context would buy nothing and
   cost a re-render on the one frame that matters most.
   ══════════════════════════════════════════════════════ */

let released = false;
let claimed = false;
const waiting = new Set<() => void>();

/**
 * "I will decide when the page comes in — do not release without me."
 *
 * Only the signal gate claims, and only when it is actually going to render.
 * The route template releases on the frame after mount UNLESS something has
 * claimed, which is the whole coordination between the two: on `/work/*`
 * there is no gate, so the template's release is the only one; on a gated
 * home load the template stands down and `close()` does it 2.4s later.
 *
 * The ordering that makes this safe is React's, not ours. Effects fire
 * bottom-up, so `SignalGate` — which lives inside `{children}` — has always
 * claimed before the template's own effect runs, and the template defers a
 * further frame on top of that.
 */
export function claimEntrance(): void {
    claimed = true;
}

export function entranceClaimed(): boolean {
    return claimed;
}

/**
 * Run `fn` once the page is allowed to animate.
 *
 * Fires SYNCHRONOUSLY if the entrance is already released, so a component
 * that mounts late — a case study reached by client-side navigation, say —
 * behaves exactly like one that was waiting all along.
 *
 * Returns an unsubscribe. Callers must use it: a component unmounted while
 * still waiting would otherwise leave a callback holding a reference to its
 * dead scope, and under React's StrictMode double-invoke that happens on
 * every single mount.
 */
export function onEntranceReady(fn: () => void): () => void {
    if (released) {
        fn();
        return () => {};
    }
    waiting.add(fn);
    return () => {
        waiting.delete(fn);
    };
}

/**
 * Let the page in.
 *
 * IDEMPOTENT, and that is load-bearing rather than defensive. There are three
 * callers — the gate, the route template and the failsafe — and on an ungated
 * load at least two of them fire. Replaying the callbacks would restart every
 * entrance mid-flight, which looks like a stutter and is very hard to read as
 * a double-release.
 *
 * The set is drained before the callbacks run, so a callback that subscribes
 * again cannot loop, and each is called exactly once whatever it does.
 */
export function releaseEntrance(): void {
    if (released) return;
    released = true;

    const pending = [...waiting];
    waiting.clear();
    for (const fn of pending) fn();
}

/** Is the page still holding? Read by tests and by the failsafe's logging. */
export function entranceHeld(): boolean {
    return !released;
}
