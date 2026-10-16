import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

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
//                        automatically (scripts/generate-cover-colors.mjs). Only set this to
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

// Vinyl colors sampled from each cover by scripts/generate-cover-colors.mjs
// (run before dev/build), keyed by record folder. Read from disk rather than
// imported so a missing file (script not run yet) just means black vinyl.
const COLORS_FILE = path.join(process.cwd(), "src", "data", "record-colors.json");

function sampledColors(): { [folder: string]: string[] } {
  try {
    return JSON.parse(fs.readFileSync(COLORS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

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
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/_+/g, " ")
    .trim();
  if (!base.includes(" ")) base = base.replace(/-+/g, " ");
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : file;
}

// Public URL for a file in a record's folder — encoded, since folder and
// file names are free-form and may contain spaces.
function publicSrc(folder: string, file: string) {
  return `/audio/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

function readRecord(folder: string): Record {
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
    colors: raw.colors ?? sampledColors()[folder] ?? [],
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
export const getRecords = cache((): Record[] => {
  if (!fs.existsSync(AUDIO_DIR)) return [];
  const folders = fs
    .readdirSync(AUDIO_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const records = folders
    .map((entry) => readRecord(entry.name))
    .filter((record) => SHOW_DRAFTS || !record.draft);

  const when = (r: Record) =>
    Date.parse(r.time) || Date.parse(`1 January ${r.time}`) || 0;
  return records.sort(
    (a, b) => when(b) - when(a) || a.name.localeCompare(b.name),
  );
});
