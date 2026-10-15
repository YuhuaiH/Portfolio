import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorkDetail from "@/components/WorkDetail";
import site from "@/data/site.json";
import { getEntry, getEntryParams } from "@/lib/works";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getEntryParams("projects");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getEntry("projects", (await params).slug);
  return {
    title: `${entry?.title ?? "Projects"} — ${site.name}`,
    description: entry?.summary,
  };
}

export default async function ProjectsEntryPage({ params }: Props) {
  const entry = getEntry("projects", (await params).slug);
  if (!entry) notFound();
  return <WorkDetail section="projects" entry={entry} />;
}
