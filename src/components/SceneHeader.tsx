"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FilmRoll } from "@/lib/photos";
import { formatDate } from "./PhotoInfoModal";
import { useFilmFocus } from "./FilmFocusProvider";

const TABS = [
  { href: "/work", label: "Film", key: "film" },
  { href: "/work/digital", label: "Digital", key: "digital" },
] as const;

// Matches each tab button's fixed width — the sliding highlight below is
// sized/positioned off this same number so the two stay in lockstep.
const TAB_WIDTH = 96;

// Rendered once, outside the per-route page content (see layout.tsx), so it
// never unmounts on navigation — that's what lets the pill's highlight
// glide between Film and Digital instead of just popping into its new
// state, and it's also why the heading text lives here now rather than in
// each page's own markup: both are one HUD unit sitting on top of the
// scene, in normal document flow (not a fixed pixel offset) so its height
// adapts to whichever heading variant is showing instead of guessing a gap
// that's either too loose or overlaps the scene below it.
export default function SceneHeader({
  filmRolls,
  digitalCount,
}: {
  filmRolls: FilmRoll[];
  digitalCount: number;
}) {
  const pathname = usePathname();
  const { focusedIndex, setFocusedIndex } = useFilmFocus();
  const active =
    pathname === "/work/digital" ? "digital" : pathname === "/work" ? "film" : null;

  if (!active) return null;

  const activeIndex = TABS.findIndex((tab) => tab.key === active);
  const focused = active === "film" && focusedIndex !== null ? filmRolls[focusedIndex] : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-6 pt-3 text-center sm:px-12 sm:pt-4">
      <div className="pointer-events-auto">
        {focused ? (
          <>
            <button
              onClick={() => setFocusedIndex(null)}
              className="mb-2 text-xs tracking-[0.15em] text-muted uppercase hover:text-accent-bright"
            >
              ← All rolls
            </button>
            <h2 className="font-heading text-lg tracking-wide italic">{focused.name}</h2>
            <p className="text-[11px] tracking-[0.15em] text-muted/70 uppercase">
              {formatDate(focused.time)}
            </p>
            <p className="text-xs tracking-[0.15em] text-muted uppercase">
              {focused.photos.length} photo{focused.photos.length === 1 ? "" : "s"} · drag to pull
              the film out · click a frame for details
            </p>
          </>
        ) : active === "film" ? (
          <>
            <h2 className="font-heading text-lg tracking-wide italic">Film</h2>
            <p className="text-xs tracking-[0.15em] text-muted uppercase">
              {filmRolls.length} roll{filmRolls.length === 1 ? "" : "s"} · click a roll to explore
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-lg tracking-wide italic">Digital</h2>
            <p className="text-xs tracking-[0.15em] text-muted uppercase">
              {digitalCount} photo{digitalCount === 1 ? "" : "s"} · click the billboard for
              details
            </p>
          </>
        )}
      </div>
      <div className="pointer-events-auto relative flex items-center rounded-full border border-accent-bright/20 bg-background/50 p-1 text-xs tracking-[0.2em] uppercase backdrop-blur-sm">
        <div
          className="absolute inset-y-1 left-1 rounded-full bg-accent-bright/30 transition-transform duration-300 ease-out"
          style={{ width: TAB_WIDTH, transform: `translateX(${activeIndex * TAB_WIDTH}px)` }}
        />
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            style={{ width: TAB_WIDTH }}
            className={`relative z-10 py-1.5 text-center transition-colors ${
              tab.key === active ? "text-foreground" : "text-muted hover:text-accent-bright"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
