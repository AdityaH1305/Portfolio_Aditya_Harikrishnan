"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

/* ── Lazy-load the modal — zero cost until triggered ── */
const SpaceInvadersModal = dynamic(
    () => import("./SpaceInvadersModal"),
    {
        ssr: false,
        loading: () => null,
    },
);

const RESUME_URL =
    "https://drive.google.com/file/d/1_UnsnR92_qbe-n9qLPr7e2Ir79QV8Wjs/view?usp=sharing";

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

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [showGame, setShowGame] = useState(false);

    /* Click tracking refs (avoid re-renders on every click) */
    const clickTimestamps = useRef<number[]>([]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    /* ── Handle rapid-click easter egg ── */
    const handleLogoClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();

            const now = Date.now();
            // Keep only clicks within the window
            clickTimestamps.current = clickTimestamps.current.filter(
                (t) => now - t < CLICK_WINDOW_MS,
            );
            clickTimestamps.current.push(now);

            if (clickTimestamps.current.length >= REQUIRED_CLICKS) {
                clickTimestamps.current = [];
                setShowGame(true);
            }
        },
        [],
    );

    return (
        <>
            <nav
                className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                    ? "bg-black/70 backdrop-blur-md border-b border-slate-800/80"
                    : "bg-transparent"
                    }`}
            >
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">

                    {/* Logo — easter-egg click target */}
                    <a
                        href="#home"
                        onClick={handleLogoClick}
                        className="font-semibold text-lg tracking-tight hover:text-indigo-400 transition-colors duration-200 select-none"
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
                            title="Send email"
                        >
                            Email
                        </a>

                        {/* Resume */}
                        <a
                            href={RESUME_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 px-4 py-1.5 text-sm font-medium rounded-full border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400 transition-all duration-200"
                        >
                            Resume
                        </a>
                    </div>

                    {/* Mobile: just Resume + Email */}
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
                            className="px-3 py-1 text-sm font-medium rounded-full border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 transition"
                        >
                            Resume
                        </a>
                    </div>
                </div>
            </nav>

            {/* ── Space Invaders Easter Egg Modal ── */}
            {showGame && (
                <SpaceInvadersModal onClose={() => setShowGame(false)} />
            )}
        </>
    );
}