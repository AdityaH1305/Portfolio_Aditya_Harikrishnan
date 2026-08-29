"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import useMagnetic from "@/hooks/useMagnetic";
import Logo from "@/components/Logo";

const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

/* Must stay index-aligned with SECTION_IDS in
   components/LivingArchitecture/stages.ts — the atlas draws one
   growth stage per entry, in this order. */
const sections = [
    { id: "intro", label: "Intro", number: "01" },
    { id: "research", label: "Approach", number: "02" },
    { id: "work", label: "Projects", number: "03" },
    { id: "projects", label: "Experiments", number: "04" },
    { id: "stack", label: "Stack", number: "05" },
    { id: "journey", label: "Journey", number: "06" },
    { id: "contact", label: "Contact", number: "07" },
];

/* ── Easter-egg config ── */
const REQUIRED_CLICKS = 5;
const CLICK_WINDOW_MS = 2000;

interface SideNavProps {
    onOpenGame: () => void;
}

/* ── Magnetic wrapper for resume link ── */
function MagneticResumeLink() {
    const ref = useMagnetic<HTMLAnchorElement>(40, 10);

    return (
        <a
            ref={ref}
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            /* blur-md, not blur-xl, and an 85% fill rather than 60%: this is
               fixed over a scrolling page, so its backdrop is re-blurred every
               frame the page moves, and blur cost scales with radius. The
               mobile island below was fixed for exactly this and this one was
               missed — it is desktop, which is also where the case-study
               choreography runs. The heavier fill holds the same legibility
               with less blur behind it.

               `.resume-pill` carries the hairline and the sweep — see
               globals.css. The old classes here included `hover:border-accent`
               with no border utility to give it a width, so the hover had been
               colouring a 0px edge since the day it was written. */
            className="resume-pill hidden md:inline-flex"
        >
            <span className="resume-pill-label">Resume</span>
        </a>
    );
}

export default function SideNav({ onOpenGame }: SideNavProps) {
    const [activeSection, setActiveSection] = useState("intro");
    const [mounted, setMounted] = useState(false);
    const clickTimestamps = useRef<number[]>([]);

    /* ── Fade in on mount ── */
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    /* ── Intersection Observer for active section tracking ── */
    useEffect(() => {
        const observers: IntersectionObserver[] = [];

        sections.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (!element) return;

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            setActiveSection(id);
                        }
                    });
                },
                {
                    rootMargin: "-40% 0px -55% 0px",
                    threshold: 0,
                }
            );

            observer.observe(element);
            observers.push(observer);
        });

        return () => observers.forEach((o) => o.disconnect());
    }, []);

    /* ── Easter egg: 5 rapid clicks on nav ── */
    const handleEasterEgg = useCallback(() => {
        const now = Date.now();
        clickTimestamps.current = clickTimestamps.current.filter(
            (t) => now - t < CLICK_WINDOW_MS
        );
        clickTimestamps.current.push(now);

        /* Tell the cursor how close the egg is to firing, so it can draw a
           charge arc. An event rather than lifted state: the count is only
           meaningful here, and Cursor is mounted in the root layout with no
           path to these props. */
        window.dispatchEvent(
            new CustomEvent("cursor:charge", {
                detail: {
                    n: clickTimestamps.current.length,
                    required: REQUIRED_CLICKS,
                },
            }),
        );

        if (clickTimestamps.current.length >= REQUIRED_CLICKS) {
            clickTimestamps.current = [];
            onOpenGame();
        }
    }, [onOpenGame]);

    return (
        <>
            {/* Desktop: Vertical navigation rail */}
            <nav
                className={`side-nav hidden md:flex transition-all duration-700 ease-out ${
                    mounted ? "opacity-100" : "opacity-0 -translate-x-4"
                }`}
                aria-label="Section navigation"
            >
                {sections.map((section) => (
                    <a
                        key={section.id}
                        href={`#${section.id}`}
                        className={`side-nav-item ${
                            activeSection === section.id ? "active" : ""
                        }`}
                        onClick={handleEasterEgg}
                    >
                        <span className="side-nav-dot" />
                        <span className="side-nav-number">{section.number}</span>
                        <span className="side-nav-label">{section.label}</span>
                    </a>
                ))}
            </nav>

            {/* Desktop: Resume link */}
            <MagneticResumeLink />

            {/* The palette's only affordance. Nothing else on the page reveals
                that Ctrl K does anything, which made the command list, and
                the one thing hiding in it, effectively undiscoverable. Sits
                under the nav rail so it reads as part of the instrument
                chrome rather than as a tooltip. */}
            <div
                className={`kbd-hint hidden md:flex transition-opacity duration-700 ease-out ${
                    mounted ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
            >
                <kbd className="keycap">Ctrl K</kbd>
            </div>

            {/* Mobile: Fluid Island Nav */}
            <nav
                /* blur-md, not blur-xl: this is fixed over a scrolling page,
                   so the backdrop is re-blurred every frame the page moves,
                   and blur cost scales with radius. Mobile GPUs feel it most.
                   The fill goes 70% → 85% to hold the same legibility with
                   less blur behind it.

                   transition-all also went: it makes the browser watch every
                   animatable property, and only opacity and transform are
                   ever animated here. */
                className={`mobile-island md:hidden fixed top-4 left-1/2 -translate-x-[50%] max-w-[calc(100%-2rem)] w-auto z-50
                           bg-surface-1/85 backdrop-blur-md rounded-full shadow-2xl
                           transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                           ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
            >
                {/* gap-6, not just justify-between: the pill is w-auto, so it
                    shrinks to content and justify-between has nothing to
                    distribute — the logo and links end up touching. */}
                <div className="flex justify-between items-center gap-6 px-5 py-3">
                    {/* `href`, `onClick` and `select-none` are all load-bearing
                        and must survive any restyling of this mark.

                        `handleEasterEgg` pushes into the SAME timestamp ring
                        the desktop rail items use and dispatches
                        `cursor:charge` on every click, which `Cursor` listens
                        for to draw its charge arc. It does NOT preventDefault,
                        so the anchor still navigates on each of the five
                        clicks. Drop the handler and both the game and the
                        cursor feedback die silently; drop `select-none` and
                        five rapid clicks select the text instead. */}
                    <a
                        href="#intro"
                        onClick={handleEasterEgg}
                        aria-label="Aditya Harikrishnan — top of page"
                        className="text-primary select-none"
                    >
                        <Logo />
                    </a>
                    <div className="flex items-center gap-3">
                        <a
                            href="mailto:adityaharikrishnan@gmail.com"
                            className="text-xs text-tertiary hover:text-accent transition-colors"
                        >
                            Email
                        </a>
                        <a
                            href={RESUME_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            /* `border` is load-bearing, not decoration.
                               This carried `hover:border-accent` with no
                               border utility on the element, so the hover
                               changed the colour of an edge that was not
                               being drawn and did nothing at all.
                               globals.css records this exact bug being fixed
                               on the DESKTOP pill (`.resume-pill`, which
                               borders at `--border-default` and brightens to
                               `--accent-border`); the mobile copy kept it.
                               Matched to that treatment rather than invented. */
                            className="px-4 py-1.5 text-xs font-medium rounded-full text-tertiary
                                       border border-edge-default
                                       hover:border-accent hover:text-accent
                                       transition-colors duration-300"
                        >
                            Resume
                        </a>
                    </div>
                </div>
            </nav>
        </>
    );
}
