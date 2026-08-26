/* ══════════════════════════════════════════════════════
   What the entrance actually waits on

   Three dynamic imports. Not images, not fonts, and deliberately not video.

   ── Why this list and nothing else ──
   The gate renders OVER a fully server-rendered page, so by the time anyone
   presses the button the browser's own preload scanner already has every
   image in the document in flight. And `next/font` emits `rel="preload"` for
   both woff2 faces in the head, ahead of any script. Adding either to this
   list would be asking for work already being done and, in the font case,
   issuing a duplicate request.

   What the scanner CANNOT see is an `import()` inside hydrated JavaScript.
   That is the real gap, and it is the whole list.

   ── GlyphA is the one that matters ──
   It is `dynamic({ ssr: false })` and it catches the 27 fragments the gate
   throws at the burst. If its chunk has not landed by then, `takeBurst()`
   returns null, the letter falls back to a fresh `shatter()`, and if the
   chunk is more than ~1.7s late the flight is skipped entirely — the A simply
   appears in the hero, already assembled, with no error anywhere.
   `SignalGate.tsx` documents that race; this closes it.

   `LivingArchitecture` is the largest dynamic chunk on the site and mounts
   unconditionally behind the overlay. `SplitText` is a smaller but sharper
   win: `Hero.tsx` fetches it only AFTER `document.fonts.ready` resolves, so
   today it is serialised behind the font load rather than running alongside
   it.

   ── Nothing here may block ──
   Every task's rejection is swallowed and counted as settled. Both existing
   asset loaders in this codebase take the same posture — `SpaceInvadersGame`
   falls back to coloured rectangles, `GaitPipeline` catches and carries on —
   and a preloader that can hang the entrance on one 404 would be the first
   thing here that does. A failed chunk means a slightly worse first second,
   not a visitor stuck on a spinner.
   ══════════════════════════════════════════════════════ */

/**
 * The work, as thunks.
 *
 * Thunks rather than promises so nothing starts until the button is actually
 * pressed — a visitor who never presses should not pay for this, and the
 * module is imported at the top of the gate.
 */
const TASKS: readonly (() => Promise<unknown>)[] = [
    /* The fragment catcher. First because it is the one with a deadline. */
    () => import("@/components/GlyphA/GlyphA"),
    /* The atlas engine — the biggest chunk, mounts immediately. */
    () => import("@/components/LivingArchitecture/LivingArchitecture"),
    /* Hero's character split, today serialised behind document.fonts.ready. */
    () => import("gsap/SplitText"),
];

export const TASK_COUNT = TASKS.length;

/**
 * Run every task, reporting `settled / total` as each lands.
 *
 * Resolves when all have settled or `timeoutMs` elapses, whichever is first.
 * Never rejects.
 *
 * `onProgress` is called with 0 immediately, so a caller can render a real
 * zero rather than an absence, and then once per settled task. It is not
 * called again after the timeout fires — a number that jumps after the ring
 * has already handed over would be a ghost.
 */
export function preloadAssets(
    onProgress: (fraction: number) => void,
    timeoutMs: number,
): Promise<void> {
    if (TASKS.length === 0) {
        onProgress(1);
        return Promise.resolve();
    }

    let settled = 0;
    let finished = false;

    onProgress(0);

    return new Promise<void>((resolve) => {
        const done = () => {
            if (finished) return;
            finished = true;
            window.clearTimeout(timer);
            resolve();
        };

        /* The ceiling. A hung request must never be able to trap anyone on
           the entrance, so this resolves regardless of what has arrived. */
        const timer = window.setTimeout(done, timeoutMs);

        for (const task of TASKS) {
            let p: Promise<unknown>;
            try {
                p = task();
            } catch {
                /* A synchronous throw from the import factory itself — rare,
                   but it must not take the whole batch down with it. */
                p = Promise.resolve();
            }

            void p
                .catch(() => {
                    /* Swallowed on purpose. See the header: a failed chunk is
                       a worse first second, not a stuck visitor. */
                })
                .then(() => {
                    if (finished) return;
                    settled += 1;
                    onProgress(settled / TASKS.length);
                    if (settled === TASKS.length) done();
                });
        }
    });
}
