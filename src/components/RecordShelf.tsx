"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import type { Record } from "@/lib/records";
import { Barcode, Grain, INK, pad2, Scanlines, TONES } from "./SpecCard";

// Same basePath fix as everywhere else that builds a public/ URL by hand.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 33⅓ rpm — one turn every 1.8s.
const SECONDS_PER_TURN = 1.8;

// The disc's pressing: two or more colors swirl into each other around the
// disc like a split colored pressing (the blue/red one in the reference);
// one color is a solid pressing; none is plain black vinyl.
function pressing(colors: string[]): string {
  if (colors.length === 0) return "#101010";
  if (colors.length === 1) return colors[0];
  const span = 360 / colors.length;
  const stops = colors.flatMap((c, i) => [
    `${c} ${i * span + span * 0.18}deg`,
    `${c} ${(i + 1) * span - span * 0.18}deg`,
  ]);
  return `conic-gradient(from 200deg, ${stops.join(", ")}, ${colors[0]} 360deg)`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Vinyl({
  record,
  out,
  spinning,
}: {
  record: Record;
  out: boolean;
  spinning: boolean;
}) {
  return (
    // Slides on this wrapper; the disc inside it spins. Kept apart so a
    // spinning disc never fights the slide for the same transform.
    <div
      aria-hidden
      // At rest it peeks a sliver out of the sleeve, and hovering the
      // record teases it a little further — a hint that it comes out.
      className={`absolute top-[2%] left-[2%] aspect-square w-[60%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        out ? "" : "group-hover:translate-x-[8%]"
      }`}
      style={{ transform: out ? "translateX(58%)" : "translateX(9%)" }}
    >
      <div
        className="vinyl-spin absolute inset-0 rounded-full shadow-[0_14px_30px_-12px_rgba(0,0,0,0.9)]"
        style={
          {
            background: pressing(record.colors),
            animationDuration: `${SECONDS_PER_TURN}s`,
            animationPlayState: spinning ? "running" : "paused",
          } as CSSProperties
        }
      >
        {/* Grooves: fine concentric rings, with a smooth lead-in band at
            the rim and the run-out area left plain near the label. */}
        <div
          className="absolute inset-[3%] rounded-full"
          style={{
            background:
              "repeating-radial-gradient(circle, rgba(0,0,0,0.16) 0 1px, rgba(255,255,255,0.03) 1px 2px, transparent 2px 3px)",
            maskImage:
              "radial-gradient(circle, transparent 36%, #000 38%, #000 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 36%, #000 38%, #000 100%)",
          }}
        />
        {/* The label — the cover art, cropped round, like the reference's
            center label repeating the sleeve. */}
        <div
          className="absolute inset-[33%] overflow-hidden rounded-full bg-cover bg-center"
          style={{
            backgroundColor: TONES.audio,
            backgroundImage: record.cover
              ? `url("${BASE_PATH}${record.cover}")`
              : undefined,
          }}
        />
        <div className="absolute inset-[48.6%] rounded-full bg-[#0b0b0b]" />
      </div>
      {/* The light on the disc: two soft glints that stay put while the
          disc turns beneath them — that fixed sheen over moving grooves is
          what sells the spin. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 30deg, transparent 0deg, rgba(255,255,255,0.16) 25deg, transparent 55deg, transparent 180deg, rgba(255,255,255,0.1) 205deg, transparent 235deg)",
        }}
      />
    </div>
  );
}

function Sleeve({ record, index }: { record: Record; index: number }) {
  return (
    <div className="absolute top-0 left-0 aspect-square w-[64%] overflow-hidden rounded-[6px] shadow-[0_22px_40px_-18px_rgba(0,0,0,0.95)]">
      {record.cover ? (
        <Image
          src={`${BASE_PATH}${record.cover}`}
          alt=""
          fill
          sizes="(min-width: 1024px) 260px, (min-width: 640px) 32vw, 64vw"
          className="object-cover"
        />
      ) : (
        // No cover art yet: a printed spec-sheet sleeve in Audio's tone.
        <div
          className="relative flex h-full w-full flex-col justify-between p-[7%] font-label"
          style={{ backgroundColor: TONES.audio, color: INK }}
        >
          <Grain />
          <Scanlines />
          <span className="relative font-display text-lg font-black">
            {pad2(index)}
          </span>
          <span className="relative font-display text-2xl leading-[1.05] font-black tracking-[-0.02em] uppercase sm:text-3xl">
            {record.name}
          </span>
          <div className="relative flex items-center justify-between border-t-[1.5px] border-current pt-2">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase">
              {record.time}
            </span>
            <Barcode value={record.id} className="h-4 w-16" />
          </div>
        </div>
      )}
      {/* Printed-board finish over the art: a soft light falloff and a
          worn, slightly lighter top edge. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),transparent_40%,rgba(0,0,0,0.25))]" />
      <div className="pointer-events-none absolute inset-0 rounded-[6px] ring-1 ring-white/10 ring-inset" />
    </div>
  );
}

// The Audio page: every record as a sleeve with its vinyl tucked inside.
// Click one and the vinyl slides out of the sleeve and starts spinning as
// its first track plays; click it again to pause (the disc stops where it
// is); start another and the first slides back home. Tracks play through
// in order, and the vinyl goes back in its sleeve after the last one.
export default function RecordShelf({ records }: { records: Record[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<{ id: string; track: number } | null>(
    null,
  );
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ at: 0, duration: NaN });
  // Whose track list is open. Only one at a time, and it follows the
  // music: starting a record opens its list (and closes any other). The
  // summary bar under each record also opens/closes it by hand.
  const [expanded, setExpanded] = useState<string | null>(null);

  const play = useCallback(
    (id: string, track: number) => {
      const record = records.find((r) => r.id === id);
      const audio = audioRef.current;
      if (!record || !audio) return;
      audio.src = `${BASE_PATH}${record.tracks[track].src}`;
      setCurrent({ id, track });
      setExpanded(id);
      setTime({ at: 0, duration: NaN });
      audio.play().catch(() => setPlaying(false));
    },
    [records],
  );

  // One shared <audio> for the whole shelf, so starting a record always
  // stops whatever else was playing.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () =>
      setTime({ at: audio.currentTime, duration: audio.duration });
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
      audioRef.current = null;
    };
  }, []);

  // Next track when one ends; back into the sleeve after the last.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (!current) return;
      const record = records.find((r) => r.id === current.id);
      if (record && current.track + 1 < record.tracks.length)
        play(current.id, current.track + 1);
      else setCurrent(null);
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [current, records, play]);

  const toggle = (id: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current?.id !== id) return play(id, 0);
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  if (records.length === 0) {
    return (
      <p className="mt-12 text-center font-display text-2xl font-black uppercase opacity-80">
        Coming soon
      </p>
    );
  }

  return (
    <ul className="mt-12 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record, i) => {
        const isCurrent = current?.id === record.id;
        const isPlaying = isCurrent && playing;
        const open = expanded === record.id;
        return (
          <li key={record.id} className="font-label">
            <button
              type="button"
              onClick={() => toggle(record.id)}
              aria-label={`${isPlaying ? "Pause" : "Play"} ${record.name}`}
              aria-pressed={isPlaying}
              className="group relative block aspect-[1.56/1] w-full cursor-pointer text-left"
            >
              <Vinyl record={record} out={isCurrent} spinning={isPlaying} />
              <Sleeve record={record} index={i + 1} />
            </button>

            <div className="mt-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-xl leading-tight font-black tracking-[-0.01em] uppercase">
                  {record.draft && (
                    <span className="mr-2 align-middle text-[10px] tracking-[0.1em] text-muted">
                      DRAFT
                    </span>
                  )}
                  {record.name}
                </h2>
                <p className="mt-1 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
                  {[record.artist, record.time].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="shrink-0 pt-1 font-display text-sm font-black text-muted">
                {pad2(i + 1)}
              </span>
            </div>
            {record.description && (
              <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/75">
                {record.description}
              </p>
            )}

            {/* Collapsed to one summary line by default — every record's
                full track list open at once made the page run very long.
                The bar shows the track count, or what's playing and how far
                in (with a hairline progress rule along its bottom edge), and
                opens the list; starting a record opens it too. */}
            <button
              type="button"
              onClick={() => setExpanded(open ? null : record.id)}
              aria-expanded={open}
              aria-controls={`tracks-${record.id}`}
              className="relative mt-4 flex w-full cursor-pointer items-center gap-4 border-t border-foreground/15 py-2.5 text-left text-[11px] font-medium tracking-[0.14em] uppercase"
            >
              {isCurrent ? (
                <>
                  <span className="shrink-0 font-display font-black tracking-normal">
                    {isPlaying ? "▮▮" : "▶"}
                  </span>
                  <span className="min-w-0 flex-1 truncate normal-case tracking-normal text-sm text-foreground">
                    {record.tracks[current.track].title}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatTime(time.at)} / {formatTime(time.duration)}
                  </span>
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 h-px bg-foreground/70"
                    style={{
                      width: `${time.duration ? (time.at / time.duration) * 100 : 0}%`,
                    }}
                  />
                </>
              ) : (
                <span className="flex-1 text-muted">
                  {pad2(record.tracks.length)}{" "}
                  {record.tracks.length === 1 ? "track" : "tracks"}
                </span>
              )}
              <span
                aria-hidden
                className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>

            {/* The list itself, sliding open/closed (0fr → 1fr grid rows
                animates to the content's real height). Click any track to
                drop the needle on it. */}
            <div
              className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden" inert={!open}>
                <ol
                  id={`tracks-${record.id}`}
                  className="border-b border-foreground/15"
                >
                  {record.tracks.map((track, t) => {
                    const active = isCurrent && current.track === t;
                    return (
                      <li key={track.src}>
                        <button
                          type="button"
                          onClick={() => play(record.id, t)}
                          className={`relative flex w-full cursor-pointer items-center gap-4 overflow-hidden border-t border-foreground/15 py-2 text-left text-sm transition-colors ${
                            active
                              ? "text-foreground"
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 bg-foreground/[0.07]"
                              style={{
                                width: `${time.duration ? (time.at / time.duration) * 100 : 0}%`,
                              }}
                            />
                          )}
                          <span className="relative w-6 font-display text-[11px] font-black">
                            {pad2(t + 1)}
                          </span>
                          <span className="relative min-w-0 flex-1 truncate">
                            {track.title}
                          </span>
                          <span className="relative text-[11px] tabular-nums opacity-70">
                            {active
                              ? `${formatTime(time.at)} / ${formatTime(time.duration)}`
                              : ""}
                            {active && (isPlaying ? " ▮▮" : " ▶")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
