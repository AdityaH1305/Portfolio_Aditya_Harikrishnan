"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import OrbNavigation from "@/components/OrbNavigation";
import About from "@/components/About";
import WhatIBuild from "@/components/WhatIBuild";
import FeaturedProject from "@/components/FeaturedProject";
import ProjectsEnhanced from "@/components/ProjectsEnhanced";
import Contact from "@/components/Contact";
import CursorGlow from "@/components/CursorGlow";
import ScrollProgress from "@/components/ScrollProgress";
import CommandPalette from "@/components/CommandPalette";
import BackgroundAtmosphere from "@/components/BackgroundAtmosphere";

/* ── Lazy-load heavy client-only modules — zero cost until needed ── */
const SpaceInvadersModal = dynamic(
    () => import("@/components/SpaceInvadersModal"),
    { ssr: false, loading: () => null },
);
const SignalField = dynamic(
    () => import("@/components/SignalField"),
    { ssr: false },
);

export default function Home() {
    const [showGame, setShowGame] = useState(false);

    const openGame = useCallback(() => setShowGame(true), []);
    const closeGame = useCallback(() => setShowGame(false), []);

    return (
        <main className="bg-black text-white min-h-screen animated-bg">
            <BackgroundAtmosphere />
            <SignalField />
            <ScrollProgress />
            <CursorGlow />
            <Navbar onOpenGame={openGame} />
            <CommandPalette onOpenGame={openGame} />
            <Hero />
            <OrbNavigation />
            <About />
            <WhatIBuild />
            <FeaturedProject />
            <ProjectsEnhanced />
            <Contact />

            {/* Space Invaders — triggered by easter egg or command palette */}
            {showGame && <SpaceInvadersModal onClose={closeGame} />}
        </main>
    );
}