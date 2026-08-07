/* Shared motion constants.
   Previously each component declared its own EASE array, and one
   of them (Contact) silently used a different curve. */

export const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const DUR = {
    fast: 0.3,
    base: 0.5,
    slow: 0.8,
} as const;
