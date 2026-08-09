import CaseStudyChrome from "@/components/CaseStudyChrome";

/* Server component. The chrome is a client component because it needs the
   pathname and mounts the atlas with `dynamic({ ssr: false })`, which is
   only legal inside a Client Component. */
export default function WorkLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-surface-0 text-primary min-h-screen relative">
            <CaseStudyChrome>{children}</CaseStudyChrome>
        </div>
    );
}
