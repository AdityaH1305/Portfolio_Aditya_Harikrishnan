import { CASE_STUDIES } from "@/lib/caseStudies";
import {
    ogSize,
    ogContentType,
    renderCaseStudyOg,
} from "@/lib/caseStudyOg";

const study = CASE_STUDIES.find(
    (c) => c.slug === "gait-multi-modal-fusion",
)!;

export const alt = `${study.title} — ${study.metric} ${study.metricLabel}`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
    return renderCaseStudyOg(study);
}
