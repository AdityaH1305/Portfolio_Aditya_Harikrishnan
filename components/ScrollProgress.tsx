"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const update = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
        };

        window.addEventListener("scroll", update, { passive: true });
        return () => window.removeEventListener("scroll", update);
    }, []);

    return (
        <div
            className="fixed top-0 left-0 h-[2px] z-[60] transition-[width] duration-150 ease-out"
            style={{
                width: `${progress}%`,
                background: "rgba(139, 92, 246, 0.6)",
            }}
        />
    );
}
