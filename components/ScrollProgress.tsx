"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * ScrollProgress — accent progress bar at the top of the viewport.
 *
 * Driven by ScrollTrigger rather than a native scroll listener. Under
 * Lenis the page moves on an eased clock, so a native `scroll` listener
 * and the rendered position visibly desynchronise during a long glide.
 *
 * gsap.matchMedia also fixes a bug in the previous version: it returned
 * early when reduced motion was set, *before* installing the change
 * listener, so turning the preference back off never restored the bar.
 */
export default function ScrollProgress() {
    const barRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const bar = barRef.current;
        if (!bar) return;

        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            bar.style.display = "";
            const st = ScrollTrigger.create({
                start: 0,
                end: "max",
                onUpdate: (self) => {
                    bar.style.width = `${self.progress * 100}%`;
                },
            });
            return () => st.kill();
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
            bar.style.display = "none";
            return () => {
                bar.style.display = "";
            };
        });

        return () => mm.revert();
    });

    return (
        <div
            ref={barRef}
            className="fixed top-0 left-0 h-[2px] z-[60]"
            style={{
                width: "0%",
                background:
                    "linear-gradient(90deg, rgb(var(--accent-rgb) / 0.4), rgb(var(--accent-rgb) / 0.7))",
                willChange: "width",
            }}
        />
    );
}
