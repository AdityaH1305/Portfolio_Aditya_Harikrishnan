import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/socialCard";
import CaseStudyHero from "@/components/CaseStudyHero";
import LudexShowcase from "@/components/LudexShowcase";

export const metadata: Metadata = {
    title: "Ludex — Aditya Harikrishnan",
    description:
        "A hybrid recommendation engine fusing content-based and collaborative signals into one ranking, with a +27% Precision@20 improvement over the content-based baseline.",
    alternates: { canonical: "/work/ludex" },
    openGraph: {
        type: "article",
        url: "/work/ludex",
        title: "Ludex — hybrid recommendation engine",
        description:
            "+27% Precision@20 over the content-based baseline, measured and written up.",
        /* Next replaces `openGraph` wholesale rather than merging it, so
           the root layout's image does NOT carry over — it has to be
           restated here or this route serves no og:image at all. */
        images: [OG_IMAGE],
    },
};

export default function LudexCaseStudy() {
    return (
        <div className="relative pt-16 md:pt-24 pb-24 md:pb-32">
            <CaseStudyHero slug="ludex" />
            <div className="mt-20 md:mt-28">
                <LudexShowcase />
            </div>
        </div>
    );
}
