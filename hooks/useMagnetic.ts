"use client";

import { useRef, useCallback } from "react";

/**
 * useMagnetic — Reusable magnetic pull effect for DOM elements.
 *
 * When the cursor enters the element and is within `radius` px of its center,
 * the element is subtly translated toward the cursor (max `maxPull` px).
 * On leave it springs back via CSS transition.
 *
 * Usage:
 *   const magnetic = useMagnetic();
 *   <div ref={magnetic.ref} onMouseMove={magnetic.onMouseMove} onMouseLeave={magnetic.onMouseLeave}>
 */
export default function useMagnetic(radius = 40, maxPull = 10) {
    const ref = useRef<HTMLElement>(null);

    const onMouseMove = useCallback(
        (e: React.MouseEvent) => {
            const el = ref.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                // Proportional pull — closer = stronger, capped at maxPull
                const strength = 1 - dist / radius;
                const pullX = dx * strength * (maxPull / radius);
                const pullY = dy * strength * (maxPull / radius);
                el.style.transform = `translate(${pullX.toFixed(2)}px, ${pullY.toFixed(2)}px)`;
                el.style.transition = "transform 0.15s ease-out";
            } else {
                el.style.transform = "translate(0, 0)";
                el.style.transition = "transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)";
            }
        },
        [radius, maxPull],
    );

    const onMouseLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = "translate(0, 0)";
        el.style.transition = "transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)";
    }, []);

    return { ref, onMouseMove, onMouseLeave };
}
