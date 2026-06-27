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
const LivingArchitecture = dynamic(
    () => import("@/components/LivingArchitecture/LivingArchitecture"),
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
            <LivingArchitecture />
            <ScrollProgress />
            <CursorGlow />

            {/* ── Navigation ── */}
            <SideNav onOpenGame={openGame} />
            <CommandPalette onOpenGame={openGame} />

            {/* ── Content Flow ── */}
            <Hero />

            <TransitionScreen
                index="01"
                heading="The proof is in the system"
                body="A recommendation engine designed to combine the strengths of collaborative and content-based filtering."
                variant="rule"
            />

            <LudexShowcase />

            <TransitionScreen
                index="02"
                heading="Systems at every scale"
                body="From recommendation engines and discovery platforms to multiplayer experiences and real-world response systems."
                variant="border"
            />

            <ProjectsEnhanced />

            <TransitionScreen
                index="03"
                heading="Behind every system"
                body="Research, experimentation, measurement, and iteration shape every engineering decision."
                variant="inline"
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