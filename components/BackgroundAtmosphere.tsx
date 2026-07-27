"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * BackgroundAtmosphere — Gold-tinted ambient layers
 *
 * Fixed-position layered overlays that add depth to the dark background:
 * 1. SVG noise texture (opacity ~0.018)
 * 2. Technical grid (1px lines, ultra-low opacity)
 * 3. Cinematic vignette (soft edge darkening)
 * 4. Localized gold radial tints (3 subtle atmospherics)
 *
 * Phase 4 refinements:
 * - Ultra-subtle parallax depth (max ±30px total travel)
 * - Scroll-responsive glow opacity (±0.01 shifts per section)
 * - Organic luminosity drift replaces mechanical breatheGlow
 *   (sine-composite with irrational frequency ratios to avoid
 *   perceivable repetition over 2+ minutes of viewing)
 * - Respects prefers-reduced-motion (static, no parallax)
 * - Pauses RAF loop when document tab is hidden
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
    const timeRef = useRef(0);
    const pausedRef = useRef(false);
    const lastTimestampRef = useRef(0);

    const animate = useCallback((timestamp: number) => {
        if (pausedRef.current) return;

        // Delta time for frame-rate independence
        if (lastTimestampRef.current === 0) {
            lastTimestampRef.current = timestamp;
        }
        const dt = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.05);
        lastTimestampRef.current = timestamp;
        timeRef.current += dt;

        // Smooth scroll interpolation
        scrollCurrent.current +=
            (scrollTarget.current - scrollCurrent.current) * 0.06;
        const s = scrollCurrent.current;

        // Parallax layers
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

        // Scroll-normalized position for section-aware glow
        const docHeight =
            document.documentElement.scrollHeight - window.innerHeight;
        const scrollNorm =
            docHeight > 0 ? scrollTarget.current / docHeight : 0;

        // ── Organic luminosity drift ──
        // Uses three sine waves with irrational frequency ratios
        // so the combined pattern doesn't obviously repeat within
        // a normal viewing session (~2 min). The result is a slow,
        // living luminance shift rather than a mechanical loop.
        const t = timeRef.current;
        const drift =
            Math.sin(t * 0.127) * 0.35 +
            Math.sin(t * 0.089) * 0.35 +
            Math.sin(t * 0.053) * 0.30;
        // drift ranges roughly -1 to +1, scaled per glow below

        // Hero glow: fades as you scroll, breathes gently at top
        if (heroGlowRef.current) {
            const scrollFade = 1.0 - scrollNorm * 0.4;
            const breathe = 1 + drift * 0.08; // ±8% luminosity
            const heroOpacity = Math.max(0.2, scrollFade) * breathe;
            heroGlowRef.current.style.opacity = heroOpacity.toFixed(4);
        }

        // Mid glow: brightens near the projects section
        if (midGlowRef.current) {
            const orbDistance = Math.abs(scrollNorm - 0.47);
            const midBoost = Math.max(0, 1 - orbDistance * 4);
            const breathe = 1 + drift * 0.06; // ±6% luminosity
            const midOpacity = (0.5 + midBoost * 0.5) * breathe;
            midGlowRef.current.style.opacity = midOpacity.toFixed(4);
        }

        // Lower glow: brightens near the featured project area
        if (lowerGlowRef.current) {
            const fpDistance = Math.abs(scrollNorm - 0.62);
            const lowerBoost = Math.max(0, 1 - fpDistance * 4);
            const breathe = 1 + drift * 0.06;
            const lowerOpacity = (0.5 + lowerBoost * 0.5) * breathe;
            lowerGlowRef.current.style.opacity = lowerOpacity.toFixed(4);
        }

        rafId.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        // Respect reduced motion — render static, no parallax
        const motionQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );
        const reducedMotion = motionQuery.matches;

        const onScroll = () => {
            scrollTarget.current = window.scrollY;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        if (!reducedMotion) {
            lastTimestampRef.current = 0;
            rafId.current = requestAnimationFrame(animate);
        }

        // Pause when tab is hidden to save CPU
        const handleVisibility = () => {
            if (document.hidden) {
                pausedRef.current = true;
            } else if (!reducedMotion) {
                pausedRef.current = false;
                lastTimestampRef.current = 0;
                rafId.current = requestAnimationFrame(animate);
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        // Dynamic reduced-motion preference changes
        const handleMotionChange = (e: MediaQueryListEvent) => {
            if (e.matches) {
                pausedRef.current = true;
                cancelAnimationFrame(rafId.current);
            } else {
                pausedRef.current = false;
                lastTimestampRef.current = 0;
                rafId.current = requestAnimationFrame(animate);
            }
        };
        motionQuery.addEventListener("change", handleMotionChange);

        return () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(rafId.current);
            document.removeEventListener("visibilitychange", handleVisibility);
            motionQuery.removeEventListener("change", handleMotionChange);
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
