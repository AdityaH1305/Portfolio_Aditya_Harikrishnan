"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * BackgroundAtmosphere — Gold-tinted
 *
 * Fixed-position layered overlays that add depth to the dark background:
 * 1. SVG noise texture (opacity ~0.025)
 * 2. Technical grid (1px lines, ultra-low opacity)
 * 3. Cinematic vignette (soft edge darkening)
 * 4. Localized gold radial tints (3 subtle atmospherics)
 *
 * Enhanced with:
 * - Ultra-subtle parallax depth (max ±30px total travel)
 * - Scroll-responsive glow opacity (±0.01 shifts per section)
 */
export default function BackgroundAtmosphere() {
    const noiseRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const heroGlowRef = useRef<HTMLDivElement>(null);
    const midGlowRef = useRef<HTMLDivElement>(null);
    const lowerGlowRef = useRef<HTMLDivElement>(null);

    const scrollCurrent = useRef(0);
    const scrollTarget = useRef(0);
    const rafId = useRef<number>(0);

    const animate = useCallback(() => {
        scrollCurrent.current +=
            (scrollTarget.current - scrollCurrent.current) * 0.04;
        const s = scrollCurrent.current;

        if (noiseRef.current) {
            noiseRef.current.style.transform = `translateY(${s * -8}px)`;
        }
        if (gridRef.current) {
            gridRef.current.style.transform = `translateY(${s * -14}px)`;
        }
        if (heroGlowRef.current) {
            heroGlowRef.current.style.transform = `translateX(-50%) translateY(${s * -20}px)`;
        }
        if (midGlowRef.current) {
            midGlowRef.current.style.transform = `translateY(${s * -25}px)`;
        }
        if (lowerGlowRef.current) {
            lowerGlowRef.current.style.transform = `translateY(${s * -30}px)`;
        }

        const docHeight =
            document.documentElement.scrollHeight - window.innerHeight;
        const scrollNorm =
            docHeight > 0 ? scrollTarget.current / docHeight : 0;

        if (heroGlowRef.current) {
            const heroOpacity = 1.0 - scrollNorm * 0.4;
            heroGlowRef.current.style.opacity = Math.max(
                0.2,
                heroOpacity
            ).toFixed(4);
        }
        if (midGlowRef.current) {
            const orbDistance = Math.abs(scrollNorm - 0.47);
            const midBoost = Math.max(0, 1 - orbDistance * 4);
            midGlowRef.current.style.opacity = (
                0.5 +
                midBoost * 0.5
            ).toFixed(4);
        }
        if (lowerGlowRef.current) {
            const fpDistance = Math.abs(scrollNorm - 0.62);
            const lowerBoost = Math.max(0, 1 - fpDistance * 4);
            lowerGlowRef.current.style.opacity = (
                0.5 +
                lowerBoost * 0.5
            ).toFixed(4);
        }

        rafId.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            scrollTarget.current = window.scrollY;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        rafId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(rafId.current);
        };
    }, [animate]);

    return (
        <div className="atmosphere-root" aria-hidden="true">
            <div
                ref={noiseRef}
                className="atmosphere-noise atmosphere-parallax"
            />
            <div
                ref={gridRef}
                className="atmosphere-grid atmosphere-parallax"
            />
            <div className="atmosphere-vignette" />
            <div
                ref={heroGlowRef}
                className="atmosphere-glow atmosphere-glow--hero atmosphere-parallax"
            />
            <div
                ref={midGlowRef}
                className="atmosphere-glow atmosphere-glow--mid atmosphere-parallax"
            />
            <div
                ref={lowerGlowRef}
                className="atmosphere-glow atmosphere-glow--lower atmosphere-parallax"
            />
        </div>
    );
}
