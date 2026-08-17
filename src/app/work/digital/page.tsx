import type { Metadata } from "next";
import DigitalCityExplorer from "@/components/DigitalCityExplorer";
import site from "@/data/site.json";

export const metadata: Metadata = {
  title: `Digital — ${site.name}`,
};

// DigitalCityScene is disabled for now (see DigitalCityExplorer.tsx) — a
// "Coming Soon" placeholder regardless of photo count, rather than the
// previous data-driven branch between the scene and an empty-state
// message, since the scene being off isn't a data problem to report.
export default function DigitalPage() {
  return (
    <div className="pb-16">
      <DigitalCityExplorer />
    </div>
  );
}
