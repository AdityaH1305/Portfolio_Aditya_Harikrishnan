"use client";

import dynamic from "next/dynamic";
import SideNav from "@/components/SideNav";
import Hero from "@/components/Hero";
import FeaturedWork from "@/components/FeaturedWork";
import ProjectsEnhanced from "@/components/ProjectsEnhanced";
import Experience from "@/components/Experience";
import ResearchMindset from "@/components/ResearchMindset";
import Skills from "@/components/Skills";
import Journey from "@/components/Journey";
import Contact from "@/components/Contact";
import ScrollProgress from "@/components/ScrollProgress";
import BackgroundAtmosphere from "@/components/BackgroundAtmosphere";
import AtmosphereParallax from "@/components/AtmosphereParallax";
import ZoneTint from "@/components/ZoneTint";
import SignalGate from "@/components/SignalGate/SignalGate";
import CanvasBoundary from "@/components/CanvasBoundary";
import UplinkTimer from "@/components/SignalGate/UplinkTimer";

/* ── Lazy-load heavy client-only modules — zero cost until needed ── */
const LivingArchitecture = dynamic(
    () => import("@/components/LivingArchitecture/LivingArchitecture"),
    { ssr: false },
);

/* The entrance's 27 fragments, after the burst — they fly on into a letter
   standing where the atlas core will be, and come apart into the atlas as the
   hero scrolls by. `ssr: false` like the atlas: it is a canvas and nothing
   else, and there is no markup worth shipping for it. */
const GlyphA = dynamic(() => import("@/components/GlyphA/GlyphA"), {
    ssr: false,
});

export default function Home() {
    /* `id="main"` matches /work/*'s landmark for consistency, but the skip
       link does NOT target it here — everything worth skipping (the gate, the
       canvases, the nav rail) is inside this element, so home targets
       `#intro` instead. See components/SkipLink.tsx. */
    return (
        <main
            id="main"
            tabIndex={-1}
            className="bg-surface-0 text-primary min-h-screen relative"
        >
            {/* Renders OVER everything below, never instead of it: the whole
                page is server-rendered underneath, so crawlers and no-JS
                visitors are unaffected and the LCP is not deferred behind an
                interaction. Home only, so a link to a case study is never
                gated. */}
            <SignalGate />

            {/* The clearance, counting down. Home only, matching the gate —
                it is the gate's receipt, and there is no gate on /work/*. It
                reads localStorage and nothing else, so it can never bring the
                gate back mid-session. */}
            <UplinkTimer />

            {/* ── Background Systems ── */}
            {/* THE POSITION IN THIS LIST IS THE MECHANISM, not housekeeping.
                Everything in this block is `fixed; z-index: 0` and every
                <section> below is `position: relative; z-index: auto`, so all
                of them paint in ONE bucket ordered by tree order. Mounted
                first, the case-study room's tint darkens the page ground and
                nothing that follows it — the grid, the grain, the atlas and
                every section's content all paint over it at full strength.
                Move this line and you change which half of the page goes
                dark. See components/ZoneTint.tsx. */}
            <ZoneTint />
            <BackgroundAtmosphere />
            <AtmosphereParallax />
            {/* Ornament only. A throw in either used to unmount the whole
                tree — both are mounted at page level, so there was nothing
                above them to catch it. The boundary renders null, so a failure
                looks exactly like a machine that never loaded the chunk. */}
            <CanvasBoundary label="atlas">
                <LivingArchitecture />
            </CanvasBoundary>
            <CanvasBoundary label="glyph">
                <GlyphA />
            </CanvasBoundary>
            <ScrollProgress />

            {/* ── Navigation ── */}
            {/* The palette and the game modal moved to
                components/SiteCommands.tsx in the root layout, so Ctrl K works
                on /work/* and the 404 too. SideNav reaches the game through
                GAME_OPEN_EVENT now — see lib/zone.ts. */}
            <SideNav />

            {/* ── Content Flow ── */}
            {/* Section order is a contract: it must match SECTION_IDS in
                LivingArchitecture/stages.ts and `sections` in SideNav.tsx,
                which index the atlas growth stage and the nav rail. */}
            <Hero />
            {/* Deliberately NOT a section id — see the note in the component.
                It sits between the hero and `#research` and leads into it, so
                `SECTION_IDS`, the nav rail and the palette are all untouched
                and the atlas still draws seven stages for seven sections. */}
            <Experience />
            <ResearchMindset />
            <FeaturedWork />
            <ProjectsEnhanced />
            <Skills />
            <Journey />
            <Contact />
        </main>
    );
}