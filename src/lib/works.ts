import type { ContentBlock } from "@/lib/content";

// The four disciplines the site covers, and the section metadata shared by
// the nav and the section pages. Each section's *content* is read from its
// own folders under public/ — one folder per item — by a server-only
// loader: photos.ts (Photography), records.ts (Audio), and workEntries.ts
// (Projects and Graphic). This file stays free of those (no fs), because
// the nav (a client component) imports SECTIONS from it.
export const SECTIONS = [
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    blurb: "Code, experiments & things I've built",
  },
  {
    key: "photography",
    label: "Photography",
    href: "/photography",
    blurb: "Film & digital photography",
  },
  {
    key: "audio",
    label: "Audio",
    href: "/audio",
    blurb: "Compositions, sound design & recordings",
  },
  {
    key: "graphic",
    label: "Graphic",
    href: "/graphic",
    blurb: "Posters, identity & visual design",
  },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
export type EntrySectionKey = Exclude<SectionKey, "photography" | "audio">;

export function getSection(key: SectionKey) {
  return SECTIONS.find((section) => section.key === key)!;
}

// One Projects/Graphic entry, as loaded from its folder's work.json by
// workEntries.ts (see there for the file format). slug is the folder name;
// cover and every block src are already resolved to full public/ URLs.
export type WorkEntry = {
  slug: string;
  title: string;
  summary: string;
  year?: string;
  role?: string;
  cover?: string;
  // The card color — sampled from the cover (see workEntries.ts).
  color?: string;
  tags?: string[];
  links?: { label: string; url: string }[];
  blocks?: ContentBlock[];
  draft?: boolean;
};
