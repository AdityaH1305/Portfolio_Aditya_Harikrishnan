"use client";

import { useEffect, useState } from "react";

const links = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Build", href: "#build" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition ${scrolled
                ? "bg-black/70 backdrop-blur border-b border-slate-800"
                : "bg-transparent"
                }`}
        >
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

                {/* Logo */}
                <a href="#" className="font-semibold text-lg">
                    Aditya
                </a>

                {/* Links */}
                <div className="flex gap-6 text-sm text-slate-300">
                    {links.map((link, i) => (
                        <a
                            key={i}
                            href={link.href}
                            className="hover:text-white transition"
                        >
                            {link.name}
                        </a>
                    ))}
                </div>

            </div>
        </nav>
    );
}