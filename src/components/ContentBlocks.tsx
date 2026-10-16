import Image from "next/image";
import type { ContentBlock } from "@/lib/content";
import { renderInlineText } from "@/lib/content";
import LoopVideo from "./LoopVideo";
import FlipBook from "./FlipBook";
import CollectionGrid from "./CollectionGrid";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — the
// basePath-prefixing logic lives in the default loader, which unoptimized
// mode bypasses entirely. Same fix as SiteHeader.tsx / FilmScene.tsx /
// DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const HEADING_CLASSES: Record<1 | 2 | 3, string> = {
  1: "font-heading text-2xl tracking-wide italic",
  // h2: section breaks inside an entry ("Highlights", "Barr VR") — pixel
  // type, like the site's other labels, so they read as chapter stamps.
  2: "pixel-shadow mt-12 font-pixel text-lg tracking-[0.12em] text-accent-bright uppercase first:mt-0",
  // h3: a sub-section — space above it to separate it from whatever came
  // before, except right under its own h2, where they read as one unit.
  3: "mt-10 font-heading text-lg tracking-wide italic first:mt-0 [h2+&]:mt-2",
};

// Two looks for the same blocks. "default" is the site's engraved, old-
// book styling (About). "spec" is the flat spec-sheet language of the
// Projects / Audio / Graphic pages (see SpecCard.tsx): wide display-type
// headings, grotesk body, and media in plain rounded frames instead of
// ornate mounts.
type Variant = "default" | "spec";

const STYLES: Record<
  Variant,
  { heading: Record<1 | 2 | 3, string>; paragraph: string; frame: string; caption: string; list: string; dash: string }
> = {
  default: {
    heading: HEADING_CLASSES,
    paragraph: "mt-6 text-sm leading-relaxed text-muted first:mt-0",
    frame: "ornate-frame bg-background shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)]",
    caption: "mt-2 text-xs tracking-[0.1em] text-muted/70 uppercase",
    list: "mt-4 flex flex-col gap-1.5 text-sm leading-relaxed text-muted first:mt-0",
    dash: "text-accent-bright/70",
  },
  spec: {
    heading: {
      1: "font-display text-2xl font-black tracking-[-0.01em] uppercase",
      2: "mt-14 flex items-center gap-3 border-t border-foreground/25 pt-4 font-display text-lg font-black tracking-[-0.01em] uppercase first:mt-0 first:border-0 first:pt-0",
      3: "mt-10 font-display text-sm font-bold tracking-[0.02em] uppercase first:mt-0 [h2+&]:mt-3",
    },
    paragraph: "mt-5 font-label text-[15px] leading-relaxed text-foreground/75 first:mt-0",
    frame: "overflow-hidden rounded-[18px] bg-black ring-1 ring-foreground/15",
    caption: "mt-2 font-label text-[10px] font-medium tracking-[0.16em] text-muted uppercase",
    list: "mt-4 flex flex-col gap-1.5 font-label text-[15px] leading-relaxed text-foreground/75 first:mt-0",
    dash: "text-muted",
  },
};

const SPACER_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6",
  md: "h-12",
  lg: "h-20",
};

function Block({ block, variant }: { block: ContentBlock; variant: Variant }) {
  const v = STYLES[variant];
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 1;
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return <Tag className={v.heading[level]}>{renderInlineText(block.text)}</Tag>;
    }

    case "paragraph":
      return (
        <p className={v.paragraph}>
          {renderInlineText(block.text)}
        </p>
      );

    case "image":
      return (
        <figure className="mt-6 first:mt-0">
          {/* Mounted in the engraved frame (.ornate-frame, see
              src/lib/ornament.ts) with a resting shadow — a plate in an
              old book rather than a flush digital image. */}
          <div className={v.frame}>
            <div
              className="relative w-full overflow-hidden bg-background"
              style={{ aspectRatio: block.aspectRatio ?? "3 / 2" }}
            >
              <Image
                src={`${BASE_PATH}${block.src}`}
                alt={block.alt}
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
          {block.caption && (
            <figcaption className={v.caption}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "gallery": {
      const columns = block.columns ?? 2;
      const aspectRatio = block.aspectRatio ?? "1 / 1";
      return (
        <div
          className={`mt-6 grid gap-4 first:mt-0 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {block.images.map((img) => (
            <figure key={img.src}>
              <div className={v.frame}>
                <div
                  className="relative w-full overflow-hidden bg-background"
                  style={{ aspectRatio }}
                >
                  {img.src.endsWith(".mp4") ? (
                    <LoopVideo
                      src={`${BASE_PATH}${img.src}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={`${BASE_PATH}${img.src}`}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 512px, 100vw"
                      className="object-cover"
                    />
                  )}
                </div>
              </div>
              {img.caption && (
                <figcaption className={v.caption}>
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      );
    }

    case "list":
      return (
        <ul className={v.list}>
          {block.items.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden className={v.dash}>
                —
              </span>
              <span>{renderInlineText(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "video": {
      // Local files under public/ need the basePath prefix; a full URL
      // (another host) is used as-is.
      const src = block.src.startsWith("/") ? `${BASE_PATH}${block.src}` : block.src;
      return (
        <figure className={`mt-6 first:mt-0 ${block.narrow ? "mx-auto max-w-xs" : ""}`}>
          <div className={v.frame}>
            {block.loop ? (
              <LoopVideo src={src} className="block h-auto w-full" />
            ) : (
              <video
                src={src}
                poster={block.poster ? `${BASE_PATH}${block.poster}` : undefined}
                controls
                preload="metadata"
                playsInline
                className="block h-auto w-full"
              />
            )}
          </div>
          {block.caption && (
            <figcaption className={v.caption}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "audio":
      return (
        <figure className="mt-6 first:mt-0">
          {block.title && (
            <p className="mb-2 font-heading text-lg tracking-wide text-foreground italic">
              {block.title}
            </p>
          )}
          {/* A local file under public/ — the same basePath fix as the
              images above, since a raw <audio src> isn't prefixed either. */}
          <audio
            controls
            preload="none"
            src={`${BASE_PATH}${block.src}`}
            className="w-full opacity-90"
          />
          {block.caption && (
            <figcaption className={v.caption}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "embed":
      // A third-party player (YouTube, Vimeo, SoundCloud, Bandcamp, Figma…)
      // — external URLs, so no basePath. Either a fixed height (audio
      // players are short strips) or an aspect ratio (video), not both.
      return (
        <div
          className="mt-6 w-full overflow-hidden border border-accent-bright/15 bg-background first:mt-0"
          style={
            block.height ? { height: block.height } : { aspectRatio: block.aspectRatio ?? "16 / 9" }
          }
        >
          <iframe
            src={block.src}
            title={block.title}
            loading="lazy"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );

    case "book":
      return (
        <FlipBook
          pages={(block.pages ?? []).map((src) => `${BASE_PATH}${src}`)}
          aspectRatio={block.aspectRatio ?? "2 / 1"}
        />
      );

    case "collection":
      return (
        <CollectionGrid
          columns={block.columns}
          images={(block.images ?? []).map((image) => ({ ...image, src: `${BASE_PATH}${image.src}` }))}
        />
      );

    case "spacer":
      return <div className={SPACER_CLASSES[block.size ?? "md"]} />;
  }
}

export default function ContentBlocks({
  blocks,
  variant = "default",
}: {
  blocks: ContentBlock[];
  variant?: Variant;
}) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} variant={variant} />
      ))}
    </>
  );
}
