import type { Metadata } from "next";
import CaseStudyHero from "@/components/CaseStudyHero";
import DoubleUNetShowcase from "@/components/DoubleUNetShowcase";

export const metadata: Metadata = {
    title: "Modified Double U-Net — Aditya Harikrishnan",
    description:
        "An implementation of the Deb & Jha Xception-VGG Double U-Net, extended to ternary segmentation separating benign from malignant lesions. 95.94% mean IoU on BUSI, 1.58 points above the baseline with fewer parameters.",
    alternates: { canonical: "/work/modified-double-unet" },
    openGraph: {
        type: "article",
        url: "/work/modified-double-unet",
        title: "Modified Double U-Net — ternary lesion segmentation",
        description:
            "95.94% mean IoU on BUSI, 1.58 points above the Double U-Net baseline with fewer parameters.",
    },
};

export default function DoubleUNetCaseStudy() {
    return (
        <div className="pt-16 md:pt-24 pb-24 md:pb-32">
            <CaseStudyHero slug="modified-double-unet" />
            <div className="mt-20 md:mt-28">
                <DoubleUNetShowcase />
            </div>
        </div>
    );
}
