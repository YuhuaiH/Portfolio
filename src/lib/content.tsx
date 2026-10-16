import type { ReactNode } from "react";
import site from "@/data/site.json";

// A small, general-purpose block content model — pages (About today, maybe
// others later) describe themselves as an ordered list of these instead of
// hand-written JSX, so adding a paragraph or an image is a data edit, not a
// code change. Text fields support two lightweight conventions, applied by
// ContentBlocks.tsx at render time:
//   - "{{name}}", "{{email}}", "{{role}}" — interpolated from site.json.
//   - "[label](https://...)" — a markdown-style inline link.
export type ContentBlock =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      aspectRatio?: string;
    }
  | {
      type: "gallery";
      // An item whose src ends in .mp4 plays as a silent looping clip.
      images: { src: string; alt: string; caption?: string }[];
      columns?: 2 | 3;
      aspectRatio?: string; // default "1 / 1"
    }
  | { type: "list"; items: string[] }
  | {
      type: "video";
      src: string;
      caption?: string;
      // loop: a silent GIF-style clip that plays itself while on screen.
      // Otherwise a regular player with controls.
      loop?: boolean;
      // narrow: capped to phone width — for portrait/vertical footage.
      narrow?: boolean;
      // poster: the frame shown before it plays (instead of the browser's
      // black or first-frame placeholder). A filename in a work.json.
      poster?: string;
    }
  | { type: "audio"; src: string; title?: string; caption?: string }
  | {
      type: "embed";
      src: string;
      title: string;
      aspectRatio?: string;
      height?: number;
    }
  | {
      // A flip-book of two-page spreads (FlipBook.tsx). In a work.json,
      // leave out "pages" to use every image in the entry's folder except
      // the cover, in filename order.
      type: "book";
      pages?: string[];
      aspectRatio?: string; // default: the first spread's own shape
    }
  | {
      // Every image in the entry's folder (except the cover) with a
      // click-to-enlarge view (CollectionGrid.tsx) — just drop files in the
      // folder. "images" is filled in by workEntries.ts. columns: 1 (the
      // default) stacks them edge to edge as one continuous strip; 2 or 3
      // lay them out as a masonry wall.
      type: "collection";
      columns?: 1 | 2 | 3;
      images?: { src: string; alt: string; width: number; height: number }[];
    }
  | {
      // Every image in the entry's folder (except the cover) as the same
      // compilation the Digital photos page uses (PhotoCompilation.tsx):
      // justified rows at each piece's own shape, shuffled or in name
      // order, with a full-screen viewer. "images" is filled in by
      // workEntries.ts, like "collection".
      type: "compilation";
      images?: { src: string; alt: string; width: number; height: number }[];
    }
  | { type: "spacer"; size?: "sm" | "md" | "lg" };

const SITE_VARS: Record<string, string> = {
  name: site.name,
  email: site.email,
  role: site.role,
};

// Replaces "{{name}}" / "{{email}}" / "{{role}}" with the matching
// site.json field, so content blocks don't have to hardcode (and risk
// drifting from) values that already live there.
export function interpolate(text: string) {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => SITE_VARS[key] ?? match,
  );
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

// Renders a string's text with "[label](url)" turned into real links — a
// small markdown-style convention rather than requiring an array of
// text/link spans for the common case of "some text, then a link". Shared
// by ContentBlocks.tsx and the About page's info boxes.
export function renderInlineText(rawText: string) {
  const text = interpolate(rawText);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [, label, href] = match;
    const isExternal = /^https?:\/\//.test(href);
    nodes.push(
      <a
        key={key++}
        href={href}
        className="underline underline-offset-2 hover:text-foreground"
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {label}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}
