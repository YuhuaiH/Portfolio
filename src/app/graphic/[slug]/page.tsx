import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorkDetail from "@/components/WorkDetail";
import site from "@/data/site.json";
import { getEntry, getEntryParams } from "@/lib/works";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getEntryParams("graphic");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getEntry("graphic", (await params).slug);
  return {
    title: `${entry?.title ?? "Graphic"} — ${site.name}`,
    description: entry?.summary,
  };
}

export default async function GraphicEntryPage({ params }: Props) {
  const entry = getEntry("graphic", (await params).slug);
  if (!entry) notFound();
  return <WorkDetail section="graphic" entry={entry} />;
}
