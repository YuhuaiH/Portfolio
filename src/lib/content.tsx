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
  | { type: "image"; src: string; alt: string; caption?: string; aspectRatio?: string }
  | { type: "gallery"; images: { src: string; alt: string; caption?: string }[]; columns?: 2 | 3 }
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
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => SITE_VARS[key] ?? match);
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
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {label}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}
