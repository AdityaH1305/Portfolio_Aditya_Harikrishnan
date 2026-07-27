"use client";

import { useEffect, useRef } from "react";

/**
 * CursorGlow — Subtle gold radial glow that follows the cursor.
 *
 * Phase 4 refinements:
 * - Z-index reduced from 9999 to 1 (sits above background, not above modals)
 * - Glow size reduced from 400px to 320px for better subtlety
 * - Respects prefers-reduced-motion (disabled entirely)
 * - Pauses RAF loop when document tab is hidden
 * - Disabled on touch/coarse-pointer devices
 */
export default function CursorGlow() {
    const glowRef = useRef<HTMLDivElement>(null);
    const mouse = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });
    const rafId = useRef<number>(0);
    const pausedRef = useRef(false);

    useEffect(() => {
        // Disable on touch devices
        if (window.matchMedia("(pointer: coarse)").matches) return;

        // Respect reduced motion
        const motionQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );
        if (motionQuery.matches) return;

        const el = glowRef.current;
        if (!el) return;

        el.style.display = "block";

        const onMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };

        const animate = () => {
            if (pausedRef.current) return;

            current.current.x +=
                (mouse.current.x - current.current.x) * 0.12;
            current.current.y +=
                (mouse.current.y - current.current.y) * 0.12;

            if (el) {
                el.style.transform = `translate(${current.current.x - 160}px, ${current.current.y - 160}px)`;
            }

            // Update global CSS variables for interactive effects
            const root = document.documentElement;
            root.style.setProperty(
                "--mouse-x",
                `${current.current.x}px`,
            );
            root.style.setProperty(
                "--mouse-y",
                `${current.current.y}px`,
            );

            rafId.current = requestAnimationFrame(animate);
        };

        window.addEventListener("mousemove", onMouseMove, { passive: true });
        rafId.current = requestAnimationFrame(animate);

        // Pause when tab is hidden
        const handleVisibility = () => {
            if (document.hidden) {
                pausedRef.current = true;
            } else {
                pausedRef.current = false;
                rafId.current = requestAnimationFrame(animate);
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        // Dynamic reduced-motion changes
        const handleMotionChange = (e: MediaQueryListEvent) => {
            if (e.matches) {
                pausedRef.current = true;
                cancelAnimationFrame(rafId.current);
                if (el) el.style.display = "none";
            }
        };
        motionQuery.addEventListener("change", handleMotionChange);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            cancelAnimationFrame(rafId.current);
            document.removeEventListener("visibilitychange", handleVisibility);
            motionQuery.removeEventListener("change", handleMotionChange);
        };
    }, []);

    return (
        <div
            ref={glowRef}
            className="fixed top-0 left-0 pointer-events-none z-[1]"
            style={{
                display: "none",
                width: 320,
                height: 320,
                borderRadius: "50%",
                background:
                    "radial-gradient(circle closest-side, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.012) 40%, rgba(212, 175, 55, 0) 100%)",
                mixBlendMode: "screen",
                willChange: "transform",
            }}
        />
    );
}
