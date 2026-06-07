"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import useMagnetic from "@/hooks/useMagnetic";

const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

const sections = [
    { id: "intro", label: "Intro", number: "01" },
    { id: "work", label: "Work", number: "02" },
    { id: "projects", label: "Projects", number: "03" },
    { id: "research", label: "Research", number: "04" },
    { id: "journey", label: "Journey", number: "05" },
    { id: "contact", label: "Contact", number: "06" },
];

/* ── Easter-egg config ── */
const REQUIRED_CLICKS = 5;
const CLICK_WINDOW_MS = 2000;

interface SideNavProps {
    onOpenGame: () => void;
}

/* ── Magnetic wrapper for resume link ── */
function MagneticResumeLink() {
    const magnetic = useMagnetic(40, 10);

    return (
        <a
            ref={magnetic.ref as React.RefObject<HTMLAnchorElement>}
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            onMouseMove={magnetic.onMouseMove}
            onMouseLeave={magnetic.onMouseLeave}
            className="fixed top-6 right-6 z-50 px-4 py-1.5 text-xs font-medium tracking-wider uppercase
                       border border-[rgba(255,255,255,0.08)] text-[var(--text-tertiary)]
                       hover:border-[var(--accent)] hover:text-[var(--accent)]
                       transition-all duration-300 hidden md:inline-block"
            style={{ display: "inline-block" }}
        >
            Resume
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

            {/* Mobile: Minimal top bar */}
            <nav
                className={`md:hidden fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-sm
                           border-b border-[rgba(255,255,255,0.05)]
                           transition-all duration-500 ease-out
                           ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
            >
                <div className="flex justify-between items-center px-4 py-3">
                    <a
                        href="#intro"
                        onClick={handleEasterEgg}
                        className="text-sm font-medium tracking-tight text-[var(--foreground)] select-none"
                    >
                        AH
                    </a>
                    <div className="flex items-center gap-3">
                        <a
                            href="mailto:adityaharikrishnan@gmail.com"
                            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                        >
                            Email
                        </a>
                        <a
                            href={RESUME_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-xs font-medium border border-[rgba(255,255,255,0.08)]
                                       text-[var(--text-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)]
                                       transition-all duration-200"
                        >
                            Resume
                        </a>
                    </div>
                </div>
            </nav>
        </>
    );
}
