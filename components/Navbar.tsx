"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import useMagnetic from "@/hooks/useMagnetic";

const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

const links = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Build", href: "#build" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
];

/* ── Easter-egg config ── */
const REQUIRED_CLICKS = 5;
const CLICK_WINDOW_MS = 2000;

interface NavbarProps {
    onOpenGame: () => void;
}

/* ── Magnetic Link wrapper ── */
function MagneticLink({
    href,
    className,
    children,
    onClick,
    target,
    rel,
}: {
    href: string;
    className: string;
    children: React.ReactNode;
    onClick?: () => void;
    target?: string;
    rel?: string;
}) {
    const magnetic = useMagnetic(40, 10);

    return (
        <a
            ref={magnetic.ref as React.RefObject<HTMLAnchorElement>}
            href={href}
            className={className}
            onClick={onClick}
            target={target}
            rel={rel}
            onMouseMove={magnetic.onMouseMove}
            onMouseLeave={magnetic.onMouseLeave}
            style={{ display: "inline-block" }}
        >
            {children}
        </a>
    );
}

export default function Navbar({ onOpenGame }: NavbarProps) {
    const scrolledRef = useRef(false);
    const navRef = useRef<HTMLElement>(null);
    const [mounted, setMounted] = useState(false);

    const clickTimestamps = useRef<number[]>([]);

    /* ── System init: navbar fades in first ── */
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 20;
            if (isScrolled !== scrolledRef.current) {
                scrolledRef.current = isScrolled;
                if (navRef.current) {
                    if (isScrolled) {
                        navRef.current.classList.add("bg-black/80", "backdrop-blur-sm", "border-b", "border-white/10");
                        navRef.current.classList.remove("bg-transparent");
                    } else {
                        navRef.current.classList.remove("bg-black/80", "backdrop-blur-sm", "border-b", "border-white/10");
                        navRef.current.classList.add("bg-transparent");
                    }
                }
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogoClick = useCallback(() => {
        const now = Date.now();

        clickTimestamps.current = clickTimestamps.current.filter(
            (t) => now - t < CLICK_WINDOW_MS,
        );
        clickTimestamps.current.push(now);

        if (clickTimestamps.current.length >= REQUIRED_CLICKS) {
            clickTimestamps.current = [];
            onOpenGame();
        }
    }, [onOpenGame]);

    return (
        <nav
            ref={navRef}
            className={`fixed top-0 w-full z-50 bg-transparent transition-all duration-500 ease-out ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
        >
            <div className="max-w-6xl mx-auto pl-2 pr-4 py-4 flex justify-between items-center">

                {/* Logo */}
                <div className="relative group">
                    <a
                        href="#home"
                        onClick={handleLogoClick}
                        className="font-semibold text-lg tracking-tight hover:text-white transition-colors duration-200 select-none block text-zinc-100"
                    >
                        Building Intelligent Systems
                    </a>
                    {/* Subtle Easter Egg Hint */}
                    <div className="absolute -bottom-4 left-0 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-1 group-hover:translate-y-0 pointer-events-none select-none flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-sky-400/40 rounded-sm animate-pulse"></div>
                        <span className="text-[9px] font-mono tracking-[0.2em] text-sky-400/40 uppercase">
                            sys.anomaly
                        </span>
                    </div>
                </div>

                {/* Links — with magnetic effect */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => (
                        <MagneticLink
                            key={link.name}
                            href={link.href}
                            className="px-3 py-1.5 text-sm text-zinc-400 rounded-md hover:text-sky-300 hover:bg-sky-400/5 transition-all duration-200"
                        >
                            {link.name}
                        </MagneticLink>
                    ))}

                    <span className="w-px h-5 bg-zinc-800 mx-2" />

                    {/* Email */}
                    <MagneticLink
                        href="mailto:adityaharikrishnan@gmail.com"
                        className="px-3 py-1.5 text-sm text-zinc-400 rounded-md hover:text-sky-300 hover:bg-sky-400/5 transition-all duration-200"
                    >
                        Email
                    </MagneticLink>

                    {/* Resume */}
                    <MagneticLink
                        href={RESUME_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 px-4 py-1.5 text-sm font-medium rounded-full border border-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all duration-200"
                    >
                        Resume
                    </MagneticLink>
                </div>

                {/* Mobile */}
                <div className="flex md:hidden items-center gap-3">
                    <a
                        href="mailto:adityaharikrishnan@gmail.com"
                        className="text-sm text-zinc-400 hover:text-white transition"
                    >
                        Email
                    </a>
                    <a
                        href={RESUME_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm font-medium rounded-full border border-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition"
                    >
                        Resume
                    </a>
                </div>
            </div>
        </nav>
    );
}