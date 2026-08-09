import type { Metadata } from "next";
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
    },
};

export default function LudexCaseStudy() {
    return (
        <div className="relative pt-16 md:pt-24 pb-24 md:pb-32">
            {/* Accent radial the Ludex block was designed against. */}
            <div className="ludex-glow" aria-hidden="true" />
            <LudexShowcase />
        </div>
    );
}
