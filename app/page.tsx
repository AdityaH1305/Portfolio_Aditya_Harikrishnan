"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SideNav from "@/components/SideNav";
import Hero from "@/components/Hero";
import FeaturedWork from "@/components/FeaturedWork";
import ProjectsEnhanced from "@/components/ProjectsEnhanced";
import ResearchMindset from "@/components/ResearchMindset";
import Skills from "@/components/Skills";
import Journey from "@/components/Journey";
import Contact from "@/components/Contact";
import CursorGlow from "@/components/CursorGlow";
import ScrollProgress from "@/components/ScrollProgress";
import CommandPalette from "@/components/CommandPalette";
import BackgroundAtmosphere from "@/components/BackgroundAtmosphere";
import AtmosphereParallax from "@/components/AtmosphereParallax";

/* ── Lazy-load heavy client-only modules — zero cost until needed ── */
const SpaceInvadersModal = dynamic(
    () => import("@/components/SpaceInvadersModal"),
    { ssr: false, loading: () => null },
);
const LivingArchitecture = dynamic(
    () => import("@/components/LivingArchitecture/LivingArchitecture"),
    { ssr: false },
);

export default function Home() {
    const [showGame, setShowGame] = useState(false);

    const openGame = useCallback(() => setShowGame(true), []);
    const closeGame = useCallback(() => setShowGame(false), []);

    return (
        <main className="bg-surface-0 text-primary min-h-screen relative">
            {/* ── Background Systems ── */}
            <BackgroundAtmosphere />
            <AtmosphereParallax />
            <LivingArchitecture />
            <ScrollProgress />
            <CursorGlow />

            {/* ── Navigation ── */}
            <SideNav onOpenGame={openGame} />
            <CommandPalette onOpenGame={openGame} />

            {/* ── Content Flow ── */}
            {/* Section order is a contract: it must match SECTION_IDS in
                LivingArchitecture/stages.ts and `sections` in SideNav.tsx,
                which index the atlas growth stage and the nav rail. */}
            <Hero />
            <FeaturedWork />
            <ProjectsEnhanced />
            <ResearchMindset />
            <Skills />
            <Journey />
            <Contact />

            {/* ── Space Invaders — triggered by easter egg or command palette ── */}
            {showGame && <SpaceInvadersModal onClose={closeGame} />}
        </main>
    );
}