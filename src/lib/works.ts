import type { ContentBlock } from "@/lib/content";
import projects from "@/data/projects.json";
import graphic from "@/data/graphic.json";

// The four disciplines the site covers. Photography is the odd one out:
// its content comes from public/photos/ (see photos.ts) and has its own 3D
// film/digital scenes, and Audio is likewise read from its own folders
// (public/audio/, see records.ts) — both only appear here for navigation.
// The other two are plain entry lists, each loaded from its own JSON file in
// src/data/ — adding a project is a data edit, the same way About's
// content blocks are.
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

// One entry in projects.json / graphic.json. Only slug,
// title and summary are required — everything else is optional so a
// half-finished entry still renders.
//   - slug:   its URL, e.g. "/projects/<slug>". Keep it lowercase-and-dashes.
//   - role:   what you did on it, shown under the title on its own page.
//   - cover:  an image path under public/, e.g. "/works/my-thing/cover.jpg".
//   - blocks: the detail page's body, same block model as about.json
//             (plus "audio" and "embed" blocks — see content.tsx).
//   - draft:  shown on localhost (`npm run dev`) only, never in the built
//             site — for laying out an entry before it's ready to publish.
export type WorkEntry = {
  slug: string;
  title: string;
  summary: string;
  year?: string;
  role?: string;
  cover?: string;
  tags?: string[];
  links?: { label: string; url: string }[];
  blocks?: ContentBlock[];
  draft?: boolean;
};

const ENTRIES: Record<EntrySectionKey, WorkEntry[]> = {
  projects: projects as WorkEntry[],
  graphic: graphic as WorkEntry[],
};

const SHOW_DRAFTS = process.env.NODE_ENV === "development";

// Published entries for a section (plus drafts in dev), in file order —
// the order they're listed in the JSON is the order they're shown.
export function getEntries(section: EntrySectionKey): WorkEntry[] {
  return ENTRIES[section].filter((entry) => SHOW_DRAFTS || !entry.draft);
}

export function getEntry(section: EntrySectionKey, slug: string): WorkEntry | undefined {
  return getEntries(section).find((entry) => entry.slug === slug);
}

// For generateStaticParams. Static export refuses to build a dynamic route
// that returns no params at all, so an empty section (or one holding only
// drafts, in a production build) falls back to a single placeholder slug,
// whose page then just 404s via getEntry() not finding it.
export function getEntryParams(section: EntrySectionKey): { slug: string }[] {
  const entries = getEntries(section);
  return entries.length > 0
    ? entries.map((entry) => ({ slug: entry.slug }))
    : [{ slug: "_empty" }];
}
