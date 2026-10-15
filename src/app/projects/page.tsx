import type { Metadata } from "next";
import WorkIndex from "@/components/WorkIndex";
import site from "@/data/site.json";
import { getEntries } from "@/lib/works";

export const metadata: Metadata = {
  title: `Projects — ${site.name}`,
};

export default function ProjectsPage() {
  return <WorkIndex section="projects" entries={getEntries("projects")} />;
}
