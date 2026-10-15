import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import sharp from "sharp";

// The Audio page's records, read from public/audio/ at build time — the
// same folder-per-item convention as Photography's film rolls
// (src/lib/photos.ts):
//
//   public/audio/
//     <any-folder-name>/        one folder = one record
//       record.json             name + time, plus optional extras (below)
//       cover.jpg               the sleeve art (optional)
//       01-intro.mp3            every audio file in the folder is a track,
//       02-night-drive.wav      in filename order, titled from its filename
//                               ("02-night-drive.wav" → "Night drive")
//
// record.json:
//   - name (required):   the record's title.
//   - time (required):   when it's from — any date string, e.g. "2025" or
//                        "October 2025".
//   - artist:            shown under the title (defaults to the site name).
//   - description:       a line or two about it.
//   - colors:            optional — the vinyl is colored from the cover art
//                        automatically (see coverColors). Only set this to
//                        override that, e.g. ["#2b7fd1", "#d2232e"] for a
//                        two-tone split; one color is a solid pressing.
//                        No cover and no colors gives black vinyl.
//   - draft:             shown on localhost (`npm run dev`) only, never in
//                        the built site.
//
// The cover is whichever image in the folder is named cover.* — or, if
// none is, the first image. No image at all is fine too: the sleeve then
// prints the record's name on plain stock instead.

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const META_FILE = "record.json";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const SHOW_DRAFTS = process.env.NODE_ENV === "development";

export type Track = { title: string; src: string };

export type Record = {
  id: string;
  name: string;
  time: string;
  artist?: string;
  description?: string;
  colors: string[];
  cover?: string;
  tracks: Track[];
  draft?: boolean;
};

// "02-night_drive.mp3" → "Night drive"; "01 - Til We Go as One.wav" → "Til
// We Go as One". Dashes only become spaces in a name with no spaces of its
// own (kebab-case like "night-drive") — in a name that already has spaces,
// a dash is real punctuation ("Epilogue - Future Past") and stays.
function titleFromFilename(file: string) {
  let base = file
    .replace(/.[^.]+$/, "")
    .replace(/^d+[s._-]*/, "")
    .replace(/_+/g, " ")
    .trim();
  if (!base.includes(" ")) base = base.replace(/-+/g, " ");
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : file;
}

// The vinyl's pressing, picked from the cover art at build time. Pixels
// are grouped by *hue* (15 slices of the color wheel), each weighted by
// how saturated it is — so the colors a cover is actually *about* win, not
// whatever covers the most area. (Grouping by raw RGB, the first version,
// let a big black background beat Cavern GP's red and blue outright.)
// Washed-out, near-black and near-white pixels sit the vote out.
//
// Returns the strongest hue plus the strongest one at least ~70° away on
// the wheel, if it's a real presence (a fifth of the first's weight) —
// a two-tone split like a colored pressing. Otherwise one solid color, and
// a cover with almost no color at all gets its average neutral tone.
const HUE_BINS = 15;

async function coverColors(imagePath: string): Promise<string[]> {
  const { data, info } = await sharp(imagePath)
    .resize(64, 64, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = Array.from({ length: HUE_BINS }, () => ({
    w: 0,
    r: 0,
    g: 0,
    b: 0,
  }));
  const neutral = { n: 0, r: 0, g: 0, b: 0 };
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 510;
    const sat = max ? (max - min) / max : 0;
    if (sat < 0.3 || light < 0.1 || light > 0.9) {
      neutral.n++;
      neutral.r += r;
      neutral.g += g;
      neutral.b += b;
      continue;
    }
    const d = max - min;
    const sector =
      max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    const hue = (sector * 60 + 360) % 360;
    const bin = bins[Math.floor(hue / (360 / HUE_BINS)) % HUE_BINS];
    const w = sat * sat;
    bin.w += w;
    bin.r += r * w;
    bin.g += g * w;
    bin.b += b * w;
  }

  const hex = (c: { r: number; g: number; b: number }, k: number) =>
    "#" +
    [c.r / k, c.g / k, c.b / k]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("");
  const ranked = bins
    .map((bin, i) => ({ ...bin, i }))
    .sort((x, y) => y.w - x.w);
  const top = ranked[0];
  if (top.w < info.width * info.height * 0.02)
    return neutral.n ? [hex(neutral, neutral.n)] : [];

  const apart = (x: number, y: number) =>
    Math.min(Math.abs(x - y), HUE_BINS - Math.abs(x - y));
  const second = ranked.find(
    (bin) => apart(bin.i, top.i) >= 3 && bin.w >= top.w * 0.2,
  );
  return second ? [hex(top, top.w), hex(second, second.w)] : [hex(top, top.w)];
}

// Public URL for a file in a record's folder — encoded, since folder and
// file names are free-form and may contain spaces.
function publicSrc(folder: string, file: string) {
  return `/audio/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

async function readRecord(folder: string): Promise<Record> {
  const dir = path.join(AUDIO_DIR, folder);
  const label = `public/audio/${folder}/`;
  const jsonPath = path.join(dir, META_FILE);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`${label}: missing ${META_FILE}`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  if (typeof raw.name !== "string" || !raw.name) {
    throw new Error(`${jsonPath}: missing required "name" field`);
  }
  if (typeof raw.time !== "string" || !raw.time) {
    throw new Error(`${jsonPath}: missing required "time" field`);
  }
  if (
    raw.colors !== undefined &&
    !(
      Array.isArray(raw.colors) &&
      raw.colors.every((c: unknown) => typeof c === "string")
    )
  ) {
    throw new Error(`${jsonPath}: "colors" must be an array of color strings`);
  }

  const files = fs.readdirSync(dir).sort((a, b) => a.localeCompare(b));
  const audioFiles = files.filter((f) =>
    AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()),
  );
  if (audioFiles.length === 0) {
    throw new Error(
      `${label}: no audio files found (expected ${AUDIO_EXTENSIONS.join(", ")})`,
    );
  }

  const images = files.filter((f) =>
    IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()),
  );
  const coverFile = images.find((f) => /^cover\./i.test(f)) ?? images[0];

  return {
    id: folder,
    name: raw.name,
    time: raw.time,
    artist: raw.artist,
    description: raw.description,
    colors:
      raw.colors ??
      (coverFile ? await coverColors(path.join(dir, coverFile)) : []),
    cover: coverFile ? publicSrc(folder, coverFile) : undefined,
    tracks: audioFiles.map((file) => ({
      title: titleFromFilename(file),
      src: publicSrc(folder, file),
    })),
    draft: raw.draft === true,
  };
}

// Every record, newest first by `time` (anything unparseable sorts last),
// then by name.
export const getRecords = cache(async (): Promise<Record[]> => {
  if (!fs.existsSync(AUDIO_DIR)) return [];
  const folders = fs
    .readdirSync(AUDIO_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const records = (
    await Promise.all(folders.map((entry) => readRecord(entry.name)))
  ).filter((record) => SHOW_DRAFTS || !record.draft);

  const when = (r: Record) =>
    Date.parse(r.time) || Date.parse(`1 January ${r.time}`) || 0;
  return records.sort(
    (a, b) => when(b) - when(a) || a.name.localeCompare(b.name),
  );
});
