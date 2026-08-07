"use client";

import { useEffect, useRef } from "react";

/**
 * useMagnetic — Reusable magnetic pull effect for DOM elements.
 *
 * When the cursor is within `radius` px of the element's center, the
 * element is translated toward it (max `maxPull` px). On leave it
 * springs back via CSS transition.
 *
 * Listeners are attached in an effect rather than returned as JSX
 * props — reading handler props off the hook during render counts as
 * accessing a ref during render, which React's compiler rules reject.
 *
 * Usage:
 *   const ref = useMagnetic();
 *   <a ref={ref}>…</a>
 */
export default function useMagnetic<T extends HTMLElement>(
    radius = 40,
    maxPull = 10,
) {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Pointer-driven translation is meaningless on touch, and the
        // spring-back never fires without a real mouseleave.
        if (window.matchMedia("(pointer: coarse)").matches) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const release = () => {
            el.style.transform = "translate(0, 0)";
            el.style.transition =
                "transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)";
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top + rect.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= radius) {
                release();
                return;
            }

            // Proportional pull — closer is stronger, capped at maxPull
            const strength = 1 - dist / radius;
            const pullX = dx * strength * (maxPull / radius);
            const pullY = dy * strength * (maxPull / radius);
            el.style.transform = `translate(${pullX.toFixed(2)}px, ${pullY.toFixed(2)}px)`;
            el.style.transition = "transform 0.15s ease-out";
        };

        el.addEventListener("mousemove", onMouseMove);
        el.addEventListener("mouseleave", release);

        return () => {
            el.removeEventListener("mousemove", onMouseMove);
            el.removeEventListener("mouseleave", release);
        };
    }, [radius, maxPull]);

    return ref;
}
