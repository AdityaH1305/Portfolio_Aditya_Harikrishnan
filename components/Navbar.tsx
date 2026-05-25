"use client";

import { useEffect, useRef, useCallback } from "react";

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

export default function Navbar({ onOpenGame }: NavbarProps) {
    const scrolledRef = useRef(false);
    const navRef = useRef<HTMLElement>(null);

    const clickTimestamps = useRef<number[]>([]);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 20;
            if (isScrolled !== scrolledRef.current) {
                scrolledRef.current = isScrolled;
                if (navRef.current) {
                    if (isScrolled) {
                        navRef.current.classList.add("bg-[#0a0a0b]/80", "backdrop-blur-sm", "border-b", "border-[#1e1e22]");
                        navRef.current.classList.remove("bg-transparent");
                    } else {
                        navRef.current.classList.remove("bg-[#0a0a0b]/80", "backdrop-blur-sm", "border-b", "border-[#1e1e22]");
                        navRef.current.classList.add("bg-transparent");
                    }
                }
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    /* ── Fixed: no preventDefault → allows scroll ── */
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
            className="fixed top-0 w-full z-50 transition-all duration-300 bg-transparent"
        >
            {/* Slightly tighter left padding */}
            <div className="max-w-6xl mx-auto pl-2 pr-4 py-4 flex justify-between items-center">

                {/* Logo */}
                <a
                    href="#home"
                    onClick={handleLogoClick}
                    className="font-semibold text-lg tracking-tight hover:text-sky-400 transition-colors duration-200 select-none"
                >
                    Building Intelligent Systems
                </a>

                {/* Links */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="px-3 py-1.5 text-sm text-slate-300 rounded-md hover:text-white hover:bg-white/5 transition-all duration-200"
                        >
                            {link.name}
                        </a>
                    ))}

                    <span className="w-px h-5 bg-slate-700 mx-2" />

                    {/* Email */}
                    <a
                        href="mailto:adityaharikrishnan@gmail.com"
                        className="px-3 py-1.5 text-sm text-slate-300 rounded-md hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                        Email
                    </a>

                    {/* Resume */}
                    <a
                        href={RESUME_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 px-4 py-1.5 text-sm font-medium rounded-full border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 hover:border-sky-400 transition-all duration-200"
                    >
                        Resume
                    </a>
                </div>

                {/* Mobile */}
                <div className="flex md:hidden items-center gap-3">
                    <a
                        href="mailto:adityaharikrishnan@gmail.com"
                        className="text-sm text-slate-300 hover:text-white transition"
                    >
                        Email
                    </a>
                    <a
                        href={RESUME_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm font-medium rounded-full border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 transition"
                    >
                        Resume
                    </a>
                </div>
            </div>
        </nav>
    );
}