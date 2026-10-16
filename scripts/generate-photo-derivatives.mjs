#!/usr/bin/env node
// Generates downscaled webp derivatives of every photo under public/photos/
// into public/photos-cache/{thumb,grid,preview}/, mirroring the source
// folder structure — these are what the site actually shows. Run before
// dev/build (see predev/prebuild in package.json), after compress-photos.mjs
// has brought any new photo down to web size. Skips files whose derivative
// is already newer than the source, so repeat runs are cheap.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PHOTOS_DIR = path.join(ROOT, "public", "photos");
const CACHE_DIR = path.join(ROOT, "public", "photos-cache");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// thumb: the film-strip frame textures — small on screen even at full zoom
// (a frame is ~160 CSS px wide at the closest zoom, ~320 device px on a 2x
// screen), so 560px is still sharp. Was 1000px: all 51 frames load at once,
// and the oversized textures cost ~4x the download, decode and GPU upload.
// (Changing a size here needs public/photos-cache/thumb/ deleted once —
// existing derivatives are only regenerated when their source changes.)
// preview: the detail-modal image and the digital scene's billboard —
// shown much larger, so it gets more headroom.
const VARIANTS = [
  { name: "thumb", maxSize: 560, quality: 74 },
  // grid: the Digital compilation's justified rows — up to ~640 CSS px
  // wide per photo, so 1200px stays sharp on a 2x screen. Only loads as a
  // photo scrolls into view.
  { name: "grid", maxSize: 1200, quality: 78, only: "digital" },
  // preview is now the largest view anyone gets (there's no "full
  // resolution" link any more), so it gets real quality headroom: q90 kept
  // film grain measurably closer to the original than q82 did.
  { name: "preview", maxSize: 2000, quality: 90 },
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
      // A variant with `only` is generated for that top-level folder alone.
      if (variant.only && rel.split(path.sep)[0] !== variant.only) continue;
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

  // Prune derivatives whose source photo is gone (renamed or removed) —
  // otherwise they'd linger in public/photos-cache/ and ship with every
  // deploy, unseen.
  const sources = new Set(relFiles.map((rel) => rel.replace(/\.[^.]+$/, ".webp")));
  let pruned = 0;
  for (const variant of VARIANTS) {
    const dir = path.join(CACHE_DIR, variant.name);
    if (!fs.existsSync(dir)) continue;
    for (const rel of walk(dir)) {
      if (!sources.has(rel)) {
        fs.unlinkSync(path.join(dir, rel));
        pruned++;
      }
    }
  }

  console.log(
    `Photo derivatives: ${generated} generated, ${upToDate} up to date${pruned ? `, ${pruned} stale removed` : ""}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
