import type { Metadata } from "next";
import WorkIndex from "@/components/WorkIndex";
import site from "@/data/site.json";
import { getEntries } from "@/lib/workEntries";

export const metadata: Metadata = {
  title: `Graphic — ${site.name}`,
};

export default function GraphicPage() {
  return <WorkIndex section="graphic" entries={getEntries("graphic")} />;
}
