#!/usr/bin/env node
// Shrinks newly added photos to web size. Camera exports and film scans are
// 3–20 MB each, and everything in public/ is deployed — so any photo over
// 3 MB in public/photos/digital/ or a roll folder in public/photos/film/ is:
//   1. copied, untouched, to the same path under media-masters/ (kept
//      locally, gitignored — the original is never lost);
//   2. replaced in place by a smaller JPEG, with its camera rotation
//      applied (sizes below);
//   3. digital only: stamped with its capture date — the original's EXIF
//      date if it has one, else the original file's modified time.
//      photos.ts reads that date; the file's own modified time isn't
//      usable, since resizing resets it and git doesn't keep it on deploy.
//      (Film dates come from each roll's roll.json instead.)
// Already-small files are left alone, so it's safe to run any time; it runs
// before dev/build (predev/prebuild in package.json). The derivatives the
// site actually shows (thumb/grid/preview) are made from the result by
// generate-photo-derivatives.mjs, which runs right after.
//
// Sizes: these files are only the *source* for those derivatives — the
// largest thing anyone sees is the 2000px preview. Film gets more headroom
// (2600px, q92) than digital (2400px, q84): grain is noise to a JPEG
// encoder, and a lower-quality source measurably softened the preview made
// from it. At 2600/q92 the preview comes out slightly *better* than it was
// from the untouched scans (avg 34.8 vs 33.7 dB PSNR against a lossless
// reference, on the grainiest rolls), at ~1/4 the file size.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PHOTOS_DIR = path.join(ROOT, "public", "photos");
const MASTERS_DIR = path.join(ROOT, "media-masters", "photos");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const THRESHOLD = 3 * 1024 * 1024;

const KINDS = {
  digital: { maxSize: 2400, quality: 84, stampDate: true },
  film: { maxSize: 2600, quality: 92, stampDate: false },
};

sharp.cache(false);

// The earliest "YYYY:MM:DD HH:MM:SS" in the EXIF block — DateTimeOriginal
// (capture) is normally the earliest of a camera's date tags.
function exifDate(exif) {
  if (!exif) return null;
  const found = exif.toString("latin1").match(/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/g);
  return found ? found.sort()[0] : null;
}

function formatExif(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}:${p(date.getMonth() + 1)}:${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

// Photos to compress: loose files in digital/, files one level down in
// film/<roll>/ — paths relative to public/photos/.
function candidates() {
  const out = [];
  const add = (rel, kind) => {
    const abs = path.join(PHOTOS_DIR, rel);
    if (IMAGE_EXTENSIONS.includes(path.extname(rel).toLowerCase()) && fs.statSync(abs).size > THRESHOLD)
      out.push({ rel, kind });
  };
  const digital = path.join(PHOTOS_DIR, "digital");
  if (fs.existsSync(digital))
    for (const f of fs.readdirSync(digital)) add(path.join("digital", f), "digital");
  const film = path.join(PHOTOS_DIR, "film");
  if (fs.existsSync(film))
    for (const roll of fs.readdirSync(film, { withFileTypes: true }))
      if (roll.isDirectory())
        for (const f of fs.readdirSync(path.join(film, roll.name))) add(path.join("film", roll.name, f), "film");
  return out;
}

async function main() {
  const files = candidates();
  if (files.length === 0) return;

  let before = 0;
  let after = 0;
  for (const { rel, kind } of files) {
    const settings = KINDS[kind];
    const src = path.join(PHOTOS_DIR, rel);
    const master = path.join(MASTERS_DIR, rel);
    fs.mkdirSync(path.dirname(master), { recursive: true });
    // copyFile keeps the original's modified time, which may be its date.
    if (!fs.existsSync(master)) fs.copyFileSync(src, master);

    let image = sharp(master)
      .rotate()
      .resize(settings.maxSize, settings.maxSize, { fit: "inside", withoutEnlargement: true });
    if (settings.stampDate) {
      const meta = await sharp(master).metadata();
      const date = exifDate(meta.exif) ?? formatExif(fs.statSync(master).mtime);
      image = image.withExif({ IFD0: { DateTime: date } });
    }
    const out = await image.jpeg({ quality: settings.quality, mozjpeg: true }).toBuffer();

    // Written as .jpg; a .png/.webp/.jpeg source is replaced by its .jpg.
    const dest = src.replace(/\.(png|webp|jpeg)$/i, ".jpg");
    const tmp = `${dest}.tmp`;
    fs.writeFileSync(tmp, out);
    fs.renameSync(tmp, dest);
    if (dest !== src) fs.unlinkSync(src);

    const size = fs.statSync(master).size;
    before += size;
    after += out.length;
    console.log(`  ${rel}: ${(size / 1048576).toFixed(1)} MB → ${Math.round(out.length / 1024)} KB`);
  }
  console.log(
    `Photos: ${files.length} compressed, ${(before / 1048576).toFixed(0)} MB → ${(after / 1048576).toFixed(1)} MB (originals in media-masters/).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
