import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/socialCard";
import CaseStudyHero from "@/components/CaseStudyHero";
import GaitShowcase from "@/components/GaitShowcase";

export const metadata: Metadata = {
    title: "Gait Recognition via Multi-Modal Fusion — Aditya Harikrishnan",
    description:
        "Cross-view gait recognition built on GaitSet and extended with a multi-modal fusion branch. 98.00% Rank-1 under normal walking on CASIA-B. Built at ISRO's Liquid Propulsion Systems Centre.",
    alternates: { canonical: "/work/gait-multi-modal-fusion" },
    openGraph: {
        type: "article",
        url: "/work/gait-multi-modal-fusion",
        title: "Gait Recognition via Multi-Modal Fusion",
        description:
            "98.00% Rank-1 cross-view gait recognition on CASIA-B, built at ISRO / LPSC.",
        /* Next replaces `openGraph` wholesale rather than merging it, so
           the root layout's image does NOT carry over — it has to be
           restated here or this route serves no og:image at all. */
        images: [OG_IMAGE],
    },
};

export default function GaitCaseStudy() {
    return (
        <div className="pt-16 md:pt-24 pb-24 md:pb-32">
            <CaseStudyHero slug="gait-multi-modal-fusion" />
            <div className="mt-20 md:mt-28">
                <GaitShowcase />
            </div>
        </div>
    );
}
