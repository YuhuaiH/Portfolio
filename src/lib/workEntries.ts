import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { imageSize } from "image-size";
import type { ContentBlock } from "@/lib/content";
import type { EntrySectionKey, WorkEntry } from "@/lib/works";

// Projects and Graphic entries, read from public/works/ at build time — one
// folder per entry, the same convention as Audio's records (records.ts)
// and Photography's film rolls (photos.ts):
//
//   public/works/
//     projects/
//       cavern-gp/            folder name = the page URL (/projects/cavern-gp)
//         work.json           the entry (fields below)
//         cover.jpg           used as the cover automatically
//         trailer.jpg         …and anything the entry's blocks show
//     graphic/
//       not-the-epilogue/
//         work.json
//
// work.json — only title and summary are required:
//   - title, summary:  the name, and a line or two under it.
//   - order:           position on the section page (1 = first). Entries
//                      without one go after those with one, newest year first.
//   - year, role, tags, links:  the spec rows and buttons on the cards/page.
//   - cover:           only needed when the cover isn't named cover.*.
//   - color:           the card color, e.g. "#c08a5a". Without one it's
//                      sampled from the cover (work-colors.json, below), and
//                      with no cover either, it's the section's own color.
//   - blocks:          the page body — see content.tsx for the block types.
//                      A src that's just a filename ("trailer.jpg") means a
//                      file in this folder; a full URL is used as-is.
//   - draft:           shown on localhost (`npm run dev`) only, never in the
//                      built site. (Its folder's files are still copied into
//                      the build, like any public/ file.)

const WORKS_DIR = path.join(process.cwd(), "public", "works");
const META_FILE = "work.json";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const SHOW_DRAFTS = process.env.NODE_ENV === "development";

// Card colors sampled from each entry's cover by
// scripts/generate-cover-colors.mjs (run before dev/build), keyed
// "section/folder". Read from disk rather than imported, so a missing file
// (script not run yet) just means the section colors.
const COLORS_FILE = path.join(process.cwd(), "src", "data", "work-colors.json");

function sampledColors(): { [key: string]: string } {
  try {
    return JSON.parse(fs.readFileSync(COLORS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

type Loaded = WorkEntry & { order?: number };

// "03_paper-moon.jpg" → "Paper moon" — a collage's caption when it has no
// other name. Same rule as Audio's track titles (records.ts).
function titleFromFilename(file: string) {
  let base = file
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/_+/g, " ")
    .trim();
  if (!base.includes(" ")) base = base.replace(/-+/g, " ");
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : file;
}

function readEntry(section: EntrySectionKey, folder: string): Loaded {
  const dir = path.join(WORKS_DIR, section, folder);
  const jsonPath = path.join(dir, META_FILE);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`public/works/${section}/${folder}/: missing ${META_FILE}`);
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  for (const field of ["title", "summary"]) {
    if (typeof raw[field] !== "string" || !raw[field]) {
      throw new Error(`${jsonPath}: missing required "${field}" field`);
    }
  }

  // A bare filename → this entry's own folder; absolute paths and URLs
  // pass through untouched.
  const base = `/works/${section}/${encodeURIComponent(folder)}/`;
  const resolve = (src: string) =>
    /^(https?:)?\/\//.test(src) || src.startsWith("/") ? src : base + encodeURI(src);

  const files = fs.readdirSync(dir).sort((x, y) => x.localeCompare(y));
  const coverFile =
    raw.cover ??
    files.find((f) => /^cover\./i.test(f) && IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()));
  // The folder's own artwork — every image except the cover, in filename
  // order (prefix with numbers to control it). What a "book" with no page
  // list, or a "collection", shows.
  const artwork = files.filter(
    (f) => f !== coverFile && IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );
  const size = (file: string) => {
    const { width = 1, height = 1 } = imageSize(fs.readFileSync(path.join(dir, file)));
    return { width, height };
  };

  const blocks: ContentBlock[] | undefined = raw.blocks?.map((block: ContentBlock) => {
    switch (block.type) {
      case "gallery":
        return { ...block, images: block.images.map((image) => ({ ...image, src: resolve(image.src) })) };
      case "book": {
        const pages = block.pages ?? artwork;
        if (pages.length === 0) return { ...block, pages: [] };
        // Default shape: the first spread's own proportions.
        const first = /^(https?:)?\/\/|^\//.test(pages[0]) ? null : size(pages[0]);
        return {
          ...block,
          pages: pages.map(resolve),
          aspectRatio: block.aspectRatio ?? (first ? `${first.width} / ${first.height}` : undefined),
        };
      }
      case "collection":
        return {
          ...block,
          images: artwork.map((file) => ({ src: resolve(file), alt: titleFromFilename(file), ...size(file) })),
        };
      case "video":
        return { ...block, src: resolve(block.src), poster: block.poster && resolve(block.poster) };
      case "embed":
        return block;
      default:
        return "src" in block ? { ...block, src: resolve(block.src) } : block;
    }
  });

  return {
    slug: folder,
    title: raw.title,
    summary: raw.summary,
    order: typeof raw.order === "number" ? raw.order : undefined,
    year: raw.year,
    role: raw.role,
    tags: raw.tags,
    links: raw.links,
    cover: coverFile ? resolve(coverFile) : undefined,
    color: raw.color ?? sampledColors()[`${section}/${folder}`],
    blocks,
    draft: raw.draft === true,
  };
}

const readSection = cache((section: EntrySectionKey): WorkEntry[] => {
  const dir = path.join(WORKS_DIR, section);
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readEntry(section, entry.name));

  const year = (e: Loaded) => Number.parseInt(e.year ?? "", 10) || 0;
  return entries.sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) ||
      year(b) - year(a) ||
      a.title.localeCompare(b.title)
  );
});

// Published entries for a section (plus drafts in dev), in page order.
export function getEntries(section: EntrySectionKey): WorkEntry[] {
  return readSection(section).filter((entry) => SHOW_DRAFTS || !entry.draft);
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
  return entries.length > 0 ? entries.map((entry) => ({ slug: entry.slug })) : [{ slug: "_empty" }];
}
