import Image from "next/image";
import PendingLink from "./PendingLink";
import {
  Barcode,
  CornerArrow,
  Grain,
  INK,
  pad2,
  PhaseDots,
  Scanlines,
  SpecRow,
  TONES,
} from "./SpecCard";
import type { SectionKey, WorkEntry } from "@/lib/works";
import { getSection } from "@/lib/works";

// Same basePath fix as ContentBlocks.tsx — unoptimized next/image never
// prefixes a hardcoded src itself.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// The cover inside a hairline ink frame, the way the reference boxes its
// readouts. An entry with no cover yet gets its index number set huge in
// the empty frame instead, so a missing image still reads as deliberate.
export function EntryCover({
  entry,
  index,
  sizes,
  className = "",
}: {
  entry: WorkEntry;
  index: number;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[14px] border-[1.5px] border-current bg-black/10 ${className}`}
    >
      {entry.cover ? (
        <Image
          src={`${BASE_PATH}${entry.cover}`}
          alt={entry.title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-display text-6xl font-black opacity-25">
          {pad2(index)}
        </span>
      )}
    </div>
  );
}

// "2025 / GAME" — the small meta stamp in a card's top-right corner.
export function entryStamp(entry: WorkEntry) {
  return [entry.year, entry.tags?.[0]].filter(Boolean).join(" / ");
}

// A section page's title block: the section name in wide display type with
// a dot of its tone, the blurb, and a count ("07 entries"). Shared with the
// Audio page (RecordShelf), so every section opens the same way.
export function SectionHeader({
  section,
  count,
  noun = ["entry", "entries"],
}: {
  section: SectionKey;
  count: number;
  noun?: [string, string];
}) {
  const { label, blurb } = getSection(section);
  const tone = TONES[section];
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <h1 className="font-display text-4xl font-black tracking-[-0.02em] uppercase sm:text-6xl">
        {label}
        <span
          aria-hidden
          className="ml-1 inline-block h-3 w-3 -translate-y-6 rounded-full sm:h-4 sm:w-4 sm:-translate-y-9"
          style={{ backgroundColor: tone }}
        />
      </h1>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
        <span>{blurb}</span>
        <span aria-hidden>·</span>
        <span>
          {pad2(count)} {count === 1 ? noun[0] : noun[1]}
        </span>
      </div>
    </header>
  );
}

// The landing page for one of the entry-based sections (Projects,
// Graphic): a wide display-type header, then every entry as a spec card in
// the section's own color (see SpecCard.tsx).
export default function WorkIndex({
  section,
  entries,
}: {
  section: SectionKey;
  entries: WorkEntry[];
}) {
  const { href } = getSection(section);
  const tone = TONES[section];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-4 pb-12 font-label sm:px-12">
      <SectionHeader section={section} count={entries.length} />

      {entries.length === 0 ? (
        <div
          className="relative mx-auto mt-12 flex h-56 max-w-md flex-col justify-between rounded-[26px] p-5"
          style={{ backgroundColor: tone, color: INK }}
        >
          <Grain />
          <Scanlines />
          <span className="relative font-display text-sm font-black">00</span>
          <span className="relative font-display text-3xl font-black uppercase">
            Coming soon
          </span>
          <PhaseDots className="relative self-end" />
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => (
            <li key={entry.slug}>
              <PendingLink
                href={`${href}/${entry.slug}`}
                className="group relative flex h-full flex-col rounded-[26px] p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out hover:-translate-y-1"
                style={{ backgroundColor: tone, color: INK }}
              >
                <Grain />
                <Scanlines />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="font-display text-base font-black">
                    {pad2(i + 1)}
                  </span>
                  <span className="text-right text-[10px] leading-tight font-bold tracking-[0.08em] uppercase">
                    {entry.draft && (
                      <span className="mr-2 rounded-full border border-current px-1.5">
                        Draft
                      </span>
                    )}
                    {entryStamp(entry)}
                  </span>
                </div>
                <EntryCover
                  entry={entry}
                  index={i + 1}
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                  className="relative mt-3 aspect-[4/3] w-full"
                />
                <h2 className="relative mt-4 line-clamp-2 min-h-[2.5em] font-display text-lg leading-[1.15] font-black tracking-[-0.01em] uppercase">
                  {entry.title}
                </h2>
                <div className="relative mt-3">
                  {entry.role && (
                    <SpecRow label="Role">
                      <span className="line-clamp-1">{entry.role}</span>
                    </SpecRow>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <SpecRow label="Tags">{entry.tags.join(" · ")}</SpecRow>
                  )}
                </div>
                <div className="relative mt-auto flex items-center justify-between gap-3 border-t-[1.5px] border-current pt-3">
                  <span className="truncate font-display text-xs font-black uppercase">
                    #{entry.slug.replace(/-/g, "").slice(0, 8)}
                  </span>
                  <Barcode value={entry.slug} className="h-4 w-14 shrink-0" />
                  <CornerArrow className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </PendingLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
