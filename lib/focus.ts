/* ══════════════════════════════════════════════════════
   Focus — the decidable half

   `hooks/useFocusTrap.ts` owns the DOM; this owns the
   arithmetic, which is the part that is wrong quietly.

   A focus trap has exactly three ways to fail and all three
   are invisible until someone tries to Tab out of a modal:
   it wraps off the end, it wraps off the start, or the
   container has nothing focusable in it and the wrap divides
   by zero. Those are assertions, so they live here.
   ══════════════════════════════════════════════════════ */

/**
 * What counts as focusable.
 *
 * `[tabindex="-1"]` is deliberately excluded: an element that is
 * programmatically focusable is not part of the Tab ORDER, and including it
 * would make Tab stop on the `<main>` landmarks the skip link targets.
 *
 * `details > summary` is here because the site may grow one; `audio`/`video`
 * are NOT, because the only `controls` player on the site
 * (components/VideoPlayer.tsx) builds its own buttons and the element itself
 * would be a second, silent stop.
 */
export const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "summary",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * The index Tab should land on.
 *
 * Wraps in both directions. Returns -1 for an empty container, which the
 * caller must treat as "there is nothing to move to, leave focus where it is"
 * — NOT as index 0, which would throw on the lookup.
 *
 * @param count how many focusable elements the container holds
 * @param from  the currently focused index, or -1 when focus is outside
 * @param dir   +1 for Tab, -1 for Shift+Tab
 */
export function nextFocusIndex(count: number, from: number, dir: 1 | -1): number {
    if (count <= 0) return -1;

    /* Focus outside the container (or on the container itself, which is
       `tabindex="-1"` and therefore not in the list). Tab enters at the top,
       Shift+Tab enters at the bottom — the direction the reader was already
       travelling. */
    if (from < 0 || from >= count) return dir === 1 ? 0 : count - 1;

    return (from + dir + count) % count;
}

/**
 * Whether a restore target is still worth focusing.
 *
 * The Lightbox and the VideoPlayer are opened from `CaseStudyStage`, whose
 * slides swap under the scroll scrub — so by the time one closes, the button
 * that opened it may have been unmounted or replaced. Focusing a detached node
 * silently does nothing and leaves focus on `<body>`, which drops the reader
 * at the top of the tab order: the exact bug the restore exists to prevent.
 */
export function canRestoreFocus(el: Element | null): el is HTMLElement {
    return (
        !!el &&
        el.isConnected &&
        typeof (el as HTMLElement).focus === "function"
    );
}
