import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { imageSize } from "image-size";

const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");
const FILM_DIR = path.join(PHOTOS_DIR, "film");
const DIGITAL_DIR = path.join(PHOTOS_DIR, "digital");
const DERIVATIVES_DIR = path.join(process.cwd(), "public", "photos-cache");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ROLL_META_FILE = "roll.json";

export type PhotoType = "film" | "digital";

export type Photo = {
  id: string;
  // The photo file itself — already web-sized by compress-photos.mjs, but
  // never shown directly: it's only the source the derivatives below are
  // made from (and their fallback if one hasn't been generated yet).
  src: string;
  // Downscaled derivative for small on-screen uses (film-strip frames).
  thumbSrc: string;
  // Mid-size derivative for the Digital compilation grid.
  gridSrc: string;
  // The largest view anyone gets: 2000px, for the film detail popup and
  // the Digital compilation's full-screen viewer.
  previewSrc: string;
  width: number;
  height: number;
  name: string;
  time: string;
  type: PhotoType;
  filmRoll?: string;
  // The roll's folder name — a stable, unique grouping key. Two different
  // rolls can share a display name (filmRoll) but never a folder, so this
  // is what getFilmRolls groups by, not the name itself.
  filmRollId?: string;
};

// Derivatives are generated ahead of time by
// scripts/generate-photo-derivatives.mjs (run via predev/prebuild) into
// public/photos-cache/<variant>/<relative path under public/photos>.webp.
// Falls back to the photo file itself (src) if a derivative hasn't been
// generated yet, so the site still works (just heavier) if that script
// hasn't run.
function derivativeSrc(relPath: string, variant: "thumb" | "grid" | "preview", fallbackSrc: string) {
  const relWebp = relPath.replace(/\.[^./\\]+$/, ".webp");
  const absPath = path.join(DERIVATIVES_DIR, variant, relWebp);
  if (!fs.existsSync(absPath)) return fallbackSrc;
  return encodeURI(`/photos-cache/${variant}/${relWebp}`);
}

// EXIF orientations 5-8 are a 90°/270° rotation, which browsers apply
// automatically when decoding the image (so the pixels a <canvas>/WebGL
// texture actually samples come out already rotated). image-size reports
// raw sensor dimensions and leaves orientation for the caller to apply —
// without this swap, a portrait phone photo stored sideways would be
// reported as landscape, so downstream aspect-ratio math (and our
// portrait-detection for the film-strip rotation) would be wrong.
function readImageSize(imagePath: string, label: string) {
  const { width, height, orientation } = imageSize(fs.readFileSync(imagePath));
  if (!width || !height) {
    throw new Error(`${label}: could not determine image dimensions`);
  }
  return orientation && orientation >= 5 && orientation <= 8
    ? { width: height, height: width }
    : { width, height };
}

// The date written into a photo's EXIF (the first "YYYY:MM:DD HH:MM:SS" in
// the file's header), as an ISO string — or null if it has none. Checked
// before falling back to the file's modified time, because that time isn't
// reliable: git doesn't keep it, so a deployed copy would show the checkout
// date. (The resized digital photos carry their original's date here.)
function exifDate(imagePath: string): string | null {
  const fd = fs.openSync(imagePath, "r");
  const head = Buffer.alloc(65536);
  const read = fs.readSync(fd, head, 0, head.length, 0);
  fs.closeSync(fd);
  const m = head.subarray(0, read).toString("latin1").match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

// Every image directly in public/photos/digital/ is a digital photo — no
// roll to group it under. A "<id>.json" sidecar is optional and only
// needs whichever of "name"/"time" you want to override; without one (or
// with fields left out), the name comes from the filename and the date
// from the image's EXIF date, else its own last-modified time.
function readDigitalPhoto(dir: string, imageFile: string, siblingEntries: string[]): Photo {
  const id = imageFile.replace(/\.[^./\\]+$/, "");
  const jsonFile = `${id}.json`;
  const imagePath = path.join(dir, imageFile);

  let name: string = id;
  let time: string | undefined;

  if (siblingEntries.includes(jsonFile)) {
    const jsonPath = path.join(dir, jsonFile);
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    if (raw.name !== undefined) {
      if (typeof raw.name !== "string" || !raw.name) {
        throw new Error(`${jsonPath}: "name" must be a non-empty string`);
      }
      name = raw.name;
    }
    if (raw.time !== undefined) {
      if (typeof raw.time !== "string" || Number.isNaN(Date.parse(raw.time))) {
        throw new Error(`${jsonPath}: "time" must be a valid date string`);
      }
      time = raw.time;
    }
  }

  time ??= exifDate(imagePath) ?? fs.statSync(imagePath).mtime.toISOString();

  const { width, height } = readImageSize(imagePath, `public/photos/digital/${imageFile}`);

  const relPath = `digital/${imageFile}`;
  const src = `/photos/digital/${imageFile}`;

  return {
    id,
    src,
    thumbSrc: derivativeSrc(relPath, "thumb", src),
    gridSrc: derivativeSrc(relPath, "grid", src),
    previewSrc: derivativeSrc(relPath, "preview", src),
    width,
    height,
    name,
    time,
    type: "digital",
  };
}

// A subfolder of public/photos/film/ is a film roll: one roll.json naming
// the roll and when it was shot, sitting alongside every frame's image
// file — every image in the folder is a photo on the roll, full stop. A
// photo's display name comes straight from its filename, and strip order
// is alphabetical by filename (prefix with numbers, e.g. "01-Balcony.jpg",
// to control it explicitly).
function readFilmRollFolder(rollDir: string, folderName: string): Photo[] {
  const jsonPath = path.join(rollDir, ROLL_META_FILE);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`public/photos/film/${folderName}/: missing ${ROLL_META_FILE}`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  if (typeof raw.name !== "string" || !raw.name) {
    throw new Error(`${jsonPath}: missing required "name" field`);
  }
  if (typeof raw.time !== "string" || Number.isNaN(Date.parse(raw.time))) {
    throw new Error(`${jsonPath}: "time" must be a valid date string`);
  }

  const files = fs
    .readdirSync(rollDir)
    .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(
      `public/photos/film/${folderName}/: no images found (expected .jpg, .jpeg, .png, or .webp)`
    );
  }

  return files.map((file) => {
    const { width, height } = readImageSize(
      path.join(rollDir, file),
      `public/photos/film/${folderName}/${file}`
    );

    const relPath = `film/${folderName}/${file}`;
    const src = encodeURI(`/photos/film/${folderName}/${file}`);

    return {
      id: `${folderName}/${file}`,
      src,
      thumbSrc: derivativeSrc(relPath, "thumb", src),
      gridSrc: derivativeSrc(relPath, "grid", src),
      previewSrc: derivativeSrc(relPath, "preview", src),
      width,
      height,
      name: file.replace(/\.[^./\\]+$/, ""),
      time: raw.time,
      type: "film" as const,
      filmRoll: raw.name,
      filmRollId: folderName,
    };
  });
}

// Wrapped in React's cache() since both the root layout (for SceneHeader's
// counts) and each page now call this — memoizing means the filesystem
// scan/image-size reads only happen once per render pass instead of twice.
export const getPhotos = cache((): Photo[] => {
  const photos: Photo[] = [];

  if (fs.existsSync(FILM_DIR)) {
    for (const entry of fs.readdirSync(FILM_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        photos.push(...readFilmRollFolder(path.join(FILM_DIR, entry.name), entry.name));
      }
    }
  }

  if (fs.existsSync(DIGITAL_DIR)) {
    const entries = fs.readdirSync(DIGITAL_DIR, { withFileTypes: true });
    const siblingEntries = entries.map((e) => e.name);
    for (const entry of entries) {
      if (entry.isFile() && IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        photos.push(readDigitalPhoto(DIGITAL_DIR, entry.name, siblingEntries));
      }
    }
  }

  return photos.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
});

export type FilmRoll = {
  id: string;
  name: string;
  time: string;
  photos: Photo[];
};

export const getFilmRolls = cache((photos: Photo[]): FilmRoll[] => {
  // Group by filmRollId (the folder), not filmRoll (the display name) —
  // two separate rolls can share a name, and each still needs its own
  // canister rather than getting merged into one. Photos within a roll all
  // share that roll's time, so the stable global sort in getPhotos()
  // already left them in filename order; no need to re-sort here.
  const rollMap = new Map<string, Photo[]>();

  for (const photo of photos) {
    if (photo.type !== "film" || !photo.filmRoll || !photo.filmRollId) continue;
    const list = rollMap.get(photo.filmRollId);
    if (list) {
      list.push(photo);
    } else {
      rollMap.set(photo.filmRollId, [photo]);
    }
  }

  const rolls = Array.from(rollMap.entries()).map(([id, rollPhotos]) => ({
    id,
    name: rollPhotos[0].filmRoll!,
    // Every photo in a roll carries that roll's own time (see above).
    time: rollPhotos[0].time,
    photos: rollPhotos,
  }));

  return rolls.sort((a, b) => {
    const latest = (roll: Photo[]) => Math.max(...roll.map((p) => Date.parse(p.time)));
    return latest(b.photos) - latest(a.photos);
  });
});
