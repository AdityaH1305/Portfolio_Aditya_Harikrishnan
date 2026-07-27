"use client";

import { useEffect, useRef } from "react";

/**
 * ScrollProgress — Gold progress bar at the top of the viewport.
 *
 * Performance:
 * - Zero React re-renders during scroll (direct ref.style mutation)
 * - Passive scroll listener — no jank
 * - Pauses when document is hidden
 * - Respects prefers-reduced-motion (hidden)
 */
export default function ScrollProgress() {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;

        // Respect reduced motion — hide the bar entirely
        const motionQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );
        if (motionQuery.matches) {
            bar.style.display = "none";
            return;
        }

        const update = () => {
            const scrollTop = window.scrollY;
            const docHeight =
                document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            bar.style.width = `${pct}%`;
        };

        window.addEventListener("scroll", update, { passive: true });
        update();

        // Respond to dynamic reduced-motion changes
        const handleMotionChange = (e: MediaQueryListEvent) => {
            bar.style.display = e.matches ? "none" : "";
        };
        motionQuery.addEventListener("change", handleMotionChange);

        return () => {
            window.removeEventListener("scroll", update);
            motionQuery.removeEventListener("change", handleMotionChange);
        };
    }, []);

    return (
        <div
            ref={barRef}
            className="fixed top-0 left-0 h-[2px] z-[60]"
            style={{
                width: "0%",
                background:
                    "linear-gradient(90deg, rgba(212, 175, 55, 0.4), rgba(212, 175, 55, 0.7))",
                willChange: "width",
            }}
        />
    );
}
