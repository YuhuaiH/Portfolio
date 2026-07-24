import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

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
};

type PhotoMeta = Pick<Photo, "name" | "time" | "type" | "filmRoll">;

function readMeta(jsonPath: string): PhotoMeta {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  if (typeof raw.name !== "string" || !raw.name) {
    throw new Error(`${jsonPath}: missing required "name" field`);
  }
  if (typeof raw.time !== "string" || Number.isNaN(Date.parse(raw.time))) {
    throw new Error(`${jsonPath}: "time" must be a valid date string`);
  }
  if (raw.type !== "film" && raw.type !== "digital") {
    throw new Error(`${jsonPath}: "type" must be "film" or "digital"`);
  }
  if (raw.type === "film" && (typeof raw.filmRoll !== "string" || !raw.filmRoll)) {
    throw new Error(`${jsonPath}: film photos require a "filmRoll" field`);
  }

  return {
    name: raw.name,
    time: raw.time,
    type: raw.type,
    ...(raw.type === "film" ? { filmRoll: raw.filmRoll } : {}),
  };
}

export function getPhotos(): Photo[] {
  if (!fs.existsSync(PHOTOS_DIR)) return [];

  const entries = fs.readdirSync(PHOTOS_DIR);
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));

  const photos = jsonFiles.map((jsonFile) => {
    const id = jsonFile.replace(/\.json$/, "");
    const imageFile = IMAGE_EXTENSIONS.map((ext) => `${id}${ext}`).find((candidate) =>
      entries.includes(candidate)
    );

    if (!imageFile) {
      throw new Error(
        `public/photos/${jsonFile}: no matching image found (expected ${id}.jpg, .jpeg, .png, or .webp)`
      );
    }

    const meta = readMeta(path.join(PHOTOS_DIR, jsonFile));
    const { width, height } = imageSize(fs.readFileSync(path.join(PHOTOS_DIR, imageFile)));

    if (!width || !height) {
      throw new Error(`public/photos/${imageFile}: could not determine image dimensions`);
    }

    return { id, src: `/photos/${imageFile}`, width, height, ...meta };
  });

  return photos.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
}

export type FilmRoll = {
  name: string;
  photos: Photo[];
};

export function getFilmRolls(photos: Photo[]): FilmRoll[] {
  const rollMap = new Map<string, Photo[]>();

  for (const photo of photos) {
    if (photo.type !== "film" || !photo.filmRoll) continue;
    const list = rollMap.get(photo.filmRoll);
    if (list) {
      list.push(photo);
    } else {
      rollMap.set(photo.filmRoll, [photo]);
    }
  }

  const rolls = Array.from(rollMap.entries()).map(([name, rollPhotos]) => ({
    name,
    photos: rollPhotos.sort((a, b) => Date.parse(a.time) - Date.parse(b.time)),
  }));

  return rolls.sort((a, b) => {
    const latest = (roll: Photo[]) => Math.max(...roll.map((p) => Date.parse(p.time)));
    return latest(b.photos) - latest(a.photos);
  });
}
