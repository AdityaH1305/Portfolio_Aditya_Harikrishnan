"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SideNav from "@/components/SideNav";
import Hero from "@/components/Hero";
import LudexShowcase from "@/components/LudexShowcase";
import TransitionScreen from "@/components/TransitionScreen";
import ProjectsEnhanced from "@/components/ProjectsEnhanced";
import ResearchMindset from "@/components/ResearchMindset";
import Skills from "@/components/Skills";
import Journey from "@/components/Journey";
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
        <main className="bg-[#050505] text-[var(--foreground)] min-h-screen relative">
            {/* ── Background Systems ── */}
            <BackgroundAtmosphere />
            <SignalField />
            <ScrollProgress />
            <CursorGlow />

            {/* ── Navigation ── */}
            <SideNav onOpenGame={openGame} />
            <CommandPalette onOpenGame={openGame} />

            {/* ── Content Flow ── */}
            <Hero />

            <TransitionScreen lines={["FROM DATA", "TO DECISIONS"]} />

            <LudexShowcase />

            <TransitionScreen
                lines={["SYSTEMS ARE BUILT", "ONE ITERATION", "AT A TIME"]}
            />

            <ProjectsEnhanced />

            <TransitionScreen
                lines={["RESEARCH", "DRIVES", "IMPROVEMENT"]}
            />

            <ResearchMindset />
            <Skills />
            <Journey />
            <Contact />

            {/* ── Space Invaders — triggered by easter egg or command palette ── */}
            {showGame && <SpaceInvadersModal onClose={closeGame} />}
        </main>
    );
}