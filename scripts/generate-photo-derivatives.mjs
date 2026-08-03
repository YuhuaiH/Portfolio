#!/usr/bin/env node
// Generates downscaled webp derivatives of every photo under public/photos/
// into public/photos-cache/{thumb,preview}/, mirroring the source folder
// structure. Run before dev/build (see predev/prebuild in package.json) so
// the site never has to ship full-resolution originals for the film-strip
// thumbnails or the detail-modal preview — those only get loaded for a
// dedicated full-resolution view or download. Skips files whose derivative
// is already newer than the source, so repeat runs are cheap.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PHOTOS_DIR = path.join(ROOT, "public", "photos");
const CACHE_DIR = path.join(ROOT, "public", "photos-cache");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// thumb: the film-strip frame textures — small on screen even at full zoom.
// preview: the detail-modal image and the digital scene's billboard —
// shown much larger, so it gets more headroom.
const VARIANTS = [
  { name: "thumb", maxSize: 1000, quality: 75 },
  { name: "preview", maxSize: 2000, quality: 82 },
];

function walk(dir, relBase = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.join(relBase, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(abs, rel));
    } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      files.push(rel);
    }
  }
  return files;
}

async function generateVariant(srcPath, destPath, maxSize, quality, srcMtimeMs) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).mtimeMs >= srcMtimeMs) {
    return false;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await sharp(srcPath)
    // Auto-orients from EXIF and strips the tag, so the derivative's own
    // pixels/dimensions already match what lib/photos.ts reports for the
    // original (which swaps width/height for orientations 5-8).
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toFile(destPath);
  return true;
}

async function main() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.log("No public/photos directory — skipping derivative generation.");
    return;
  }

  const relFiles = walk(PHOTOS_DIR);
  let generated = 0;
  let upToDate = 0;

  for (const rel of relFiles) {
    const srcPath = path.join(PHOTOS_DIR, rel);
    const srcMtimeMs = fs.statSync(srcPath).mtimeMs;
    const relWebp = rel.replace(/\.[^.]+$/, ".webp");

    for (const variant of VARIANTS) {
      const destPath = path.join(CACHE_DIR, variant.name, relWebp);
      const didGenerate = await generateVariant(
        srcPath,
        destPath,
        variant.maxSize,
        variant.quality,
        srcMtimeMs
      );
      if (didGenerate) generated++;
      else upToDate++;
    }
  }

  console.log(`Photo derivatives: ${generated} generated, ${upToDate} up to date.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
