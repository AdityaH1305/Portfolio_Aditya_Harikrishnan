"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
    const glowRef = useRef<HTMLDivElement>(null);
    const mouse = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });
    const rafId = useRef<number>(0);

    useEffect(() => {
        // Disable on touch devices
        if (window.matchMedia("(pointer: coarse)").matches) return;

        const el = glowRef.current;
        if (!el) return;

        el.style.display = "block";

        const onMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };

        const animate = () => {
            // Smooth lerp for buttery movement
            current.current.x += (mouse.current.x - current.current.x) * 0.15;
            current.current.y += (mouse.current.y - current.current.y) * 0.15;

            if (el) {
                el.style.transform = `translate(${current.current.x - 200}px, ${current.current.y - 200}px)`;
            }

            rafId.current = requestAnimationFrame(animate);
        };

        window.addEventListener("mousemove", onMouseMove, { passive: true });
        rafId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            cancelAnimationFrame(rafId.current);
        };
    }, []);

    return (
        <div
            ref={glowRef}
            className="fixed top-0 left-0 pointer-events-none z-[9999]"
            style={{
                display: "none",
                width: 400,
                height: 400,
                borderRadius: "50%",
                background:
                    "radial-gradient(circle, rgba(120, 119, 255, 0.07) 0%, rgba(120, 119, 255, 0.03) 40%, transparent 70%)",
                mixBlendMode: "screen",
                willChange: "transform",
            }}
        />
    );
}
