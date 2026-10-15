#!/usr/bin/env node
// Picks each Audio record's vinyl colors from its cover art and writes
// them to src/data/record-colors.json, keyed by record folder — read by
// src/lib/records.ts. Run before dev/build (predev/prebuild in
// package.json), like generate-photo-derivatives.mjs.
//
// Why a separate script instead of doing it inside the Next build: Next
// ships its own copy of sharp (for its image/OG rendering), and loading
// that alongside this project's sharp in one build worker crashes libvips
// ("colourspace: parameter space not set"). Keeping all of this project's
// sharp work in plain Node scripts means the Next build never loads it.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const OUT_FILE = path.join(ROOT, "src", "data", "record-colors.json");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

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

async function coverColors(imagePath) {
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

  const hex = (c, k) =>
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

  const apart = (x, y) =>
    Math.min(Math.abs(x - y), HUE_BINS - Math.abs(x - y));
  const second = ranked.find(
    (bin) => apart(bin.i, top.i) >= 3 && bin.w >= top.w * 0.2,
  );
  return second ? [hex(top, top.w), hex(second, second.w)] : [hex(top, top.w)];
}

const colors = {};
if (fs.existsSync(AUDIO_DIR)) {
  for (const entry of fs.readdirSync(AUDIO_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(AUDIO_DIR, entry.name);
    // Same cover rule as records.ts: cover.*, else the first image.
    const images = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort((x, y) => x.localeCompare(y));
    const cover = images.find((f) => /^cover\./i.test(f)) ?? images[0];
    if (cover) colors[entry.name] = await coverColors(path.join(dir, cover));
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(colors, null, 2) + "\n");
console.log(`Record colors: ${Object.keys(colors).length} cover(s) sampled.`);
