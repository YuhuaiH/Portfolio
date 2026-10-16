import ContentBlocks from "./ContentBlocks";
import PendingLink from "./PendingLink";
import { entryStamp } from "./WorkIndex";
import {
  Barcode,
  CornerArrow,
  catalogNo,
  Grain,
  INK,
  pad2,
  PhaseDots,
  Scanlines,
  SpecRow,
  TONES,
} from "./SpecCard";
import type { EntrySectionKey, WorkEntry } from "@/lib/works";
import { getSection } from "@/lib/works";
import { getEntries } from "@/lib/workEntries";

// One entry's own page. Up top, a big spec card in the section's color
// (see SpecCard.tsx): title and summary on the left, a ruled spec table
// (year, role, tags) and the outbound links on the right, a code + barcode
// footer. Below it, the write-up on the dark page, in the content blocks'
// "spec" look — left-aligned, since a write-up runs long and centered body
// text gets hard to read past a few lines.
//
// No cover image here: the cover fronts the entry's card on the section
// page, and on its own page it only stood between the visitor and the
// actual work. Instead, an entry whose first block is a video (a trailer,
// a gameplay capture) gets that video straight under the header at full
// page width — the first thing you see, where the cover used to be.
export default function WorkDetail({
  section,
  entry,
}: {
  section: EntrySectionKey;
  entry: WorkEntry;
}) {
  const { label, href } = getSection(section);
  // The entry's own card color (sampled from its cover), else the section's.
  const tone = entry.color ?? TONES[section];
  const index = getEntries(section).findIndex((e) => e.slug === entry.slug) + 1;
  const stamp = entryStamp(entry);
  // An entry whose page *is* the work — a flip-book or a collection wall —
  // gets the full page width: the work is the point, not a column of text.
  const showcase =
    entry.blocks?.some((b) => b.type === "book" || b.type === "collection") ?? false;
  const blocks = entry.blocks ?? [];
  const lead = blocks[0]?.type === "video" ? blocks[0] : null;
  const body = lead ? blocks.slice(1) : blocks;

  return (
    <article
      className={`mx-auto w-full ${showcase ? "max-w-6xl" : "max-w-5xl"} px-6 pt-4 pb-16 font-label sm:px-12`}
    >
      <PendingLink
        href={href}
        className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase hover:text-foreground"
      >
        ← All {label.toLowerCase()}
      </PendingLink>

      <header
        className="relative mt-4 rounded-[28px] p-5 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.9)] sm:p-7"
        style={{ backgroundColor: tone, color: INK }}
      >
        <Grain />
        <Scanlines />
        <div className="relative flex items-start justify-between gap-4">
          <span className="font-display text-lg font-black">
            {pad2(Math.max(index, 1))}
          </span>
          <span className="text-right text-[10px] leading-tight font-bold tracking-[0.08em] uppercase">
            {label}
            {stamp && (
              <>
                <br />
                {stamp}
              </>
            )}
          </span>
        </div>

        <div className="relative mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h1 className="font-display text-3xl leading-[1.05] font-black tracking-[-0.02em] uppercase sm:text-5xl">
              {entry.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed font-medium">
              {entry.summary}
            </p>
          </div>

          <div>
            <div className="border-b border-current/70">
              {entry.year && <SpecRow label="Year">{entry.year}</SpecRow>}
              {entry.role && <SpecRow label="Role">{entry.role}</SpecRow>}
              {entry.tags && entry.tags.length > 0 && (
                <SpecRow label="Tags">{entry.tags.join(" · ")}</SpecRow>
              )}
              {entry.draft && <SpecRow label="Status">Draft</SpecRow>}
            </div>
            {entry.links && entry.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {entry.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-current px-3 py-1 text-[11px] font-bold tracking-[0.1em] uppercase transition-colors hover:bg-[#141312] hover:text-[var(--tone)]"
                    style={{ ["--tone" as string]: tone }}
                  >
                    {link.label}
                    <CornerArrow className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-8 flex items-center justify-between gap-4 border-t-[1.5px] border-current pt-3">
          <span className="truncate font-display text-sm font-black uppercase">
            {catalogNo(section, Math.max(index, 1))}
          </span>
          <div className="flex items-center gap-4">
            <Barcode value={entry.slug} className="hidden h-4 w-20 sm:block" />
            <PhaseDots />
          </div>
        </div>
      </header>

      {lead && (
        <div className="mt-6">
          <ContentBlocks blocks={[lead]} variant="spec" />
        </div>
      )}

      {body.length > 0 && (
        <div className={`mx-auto text-left ${showcase ? "mt-8" : "mt-14 max-w-3xl"}`}>
          <ContentBlocks blocks={body} variant="spec" />
        </div>
      )}
    </article>
  );
}
