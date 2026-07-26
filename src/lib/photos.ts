import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ROLL_META_FILE = "roll.json";

export type PhotoType = "film" | "digital";

export type Photo = {
  id: string;
  src: string;
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

// A loose "<id>.json" + "<id>.<ext>" pair directly in public/photos/ is a
// single digital photo — no roll to group it under.
function readDigitalPhoto(dir: string, jsonFile: string, siblingEntries: string[]): Photo {
  const id = jsonFile.replace(/\.json$/, "");
  const jsonPath = path.join(dir, jsonFile);
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  if (typeof raw.name !== "string" || !raw.name) {
    throw new Error(`${jsonPath}: missing required "name" field`);
  }
  if (typeof raw.time !== "string" || Number.isNaN(Date.parse(raw.time))) {
    throw new Error(`${jsonPath}: "time" must be a valid date string`);
  }

  const imageFile = IMAGE_EXTENSIONS.map((ext) => `${id}${ext}`).find((candidate) =>
    siblingEntries.includes(candidate)
  );
  if (!imageFile) {
    throw new Error(
      `public/photos/${jsonFile}: no matching image found (expected ${id}.jpg, .jpeg, .png, or .webp)`
    );
  }

  const { width, height } = readImageSize(path.join(dir, imageFile), `public/photos/${imageFile}`);

  return {
    id,
    src: `/photos/${imageFile}`,
    width,
    height,
    name: raw.name,
    time: raw.time,
    type: "digital",
  };
}

// A subfolder of public/photos/ is a film roll: one roll.json naming the
// roll and when it was shot, sitting alongside every frame's image file —
// every image in the folder is a photo on the roll, full stop. A photo's
// display name comes straight from its filename, and strip order is
// alphabetical by filename (prefix with numbers, e.g. "01-Balcony.jpg", to
// control it explicitly).
function readFilmRollFolder(rollDir: string, folderName: string): Photo[] {
  const jsonPath = path.join(rollDir, ROLL_META_FILE);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`public/photos/${folderName}/: missing ${ROLL_META_FILE}`);
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
      `public/photos/${folderName}/: no images found (expected .jpg, .jpeg, .png, or .webp)`
    );
  }

  return files.map((file) => {
    const { width, height } = readImageSize(
      path.join(rollDir, file),
      `public/photos/${folderName}/${file}`
    );

    return {
      id: `${folderName}/${file}`,
      src: encodeURI(`/photos/${folderName}/${file}`),
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

export function getPhotos(): Photo[] {
  if (!fs.existsSync(PHOTOS_DIR)) return [];

  const entries = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true });
  const siblingEntries = entries.map((e) => e.name);
  const photos: Photo[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      photos.push(...readFilmRollFolder(path.join(PHOTOS_DIR, entry.name), entry.name));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      photos.push(readDigitalPhoto(PHOTOS_DIR, entry.name, siblingEntries));
    }
  }

  return photos.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
}

export type FilmRoll = {
  id: string;
  name: string;
  time: string;
  photos: Photo[];
};

export function getFilmRolls(photos: Photo[]): FilmRoll[] {
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
}
