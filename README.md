# Portfolio

Personal photography portfolio, built with Next.js (App Router) and Tailwind CSS, deployed as a static site to GitHub Pages.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Site info

Your name, bio, email, and social links live in [`src/data/site.json`](src/data/site.json) and are used across the header, footer, about, contact, and page metadata:

```json
{
  "name": "Your Name",
  "role": "Photographer",
  "bio": "A short bio goes here...",
  "email": "you@example.com",
  "social": [
    { "label": "Instagram", "url": "https://instagram.com/" },
    { "label": "LinkedIn", "url": "https://linkedin.com/" }
  ]
}
```

Edit the values and every page picks them up automatically.

## Adding photos

`public/photos/` holds two kinds of entries, told apart by whether they're a loose file or a folder:

**Digital photos** are a loose image file plus a JSON sidecar with the same base name:

```text
public/photos/golden-gate-dusk.jpg
public/photos/golden-gate-dusk.json
```

```json
{
  "name": "Golden Gate at Dusk",
  "time": "2026-03-14",
  "type": "digital"
}
```

**Film rolls** are a folder — named anything, it's just an internal id — containing every frame's image plus one `roll.json` naming the roll and when it was shot. Every image in the folder is a photo on the roll, full stop — no need to list them:

```text
public/photos/kodak-portra-400/
  roll.json
  01-Market Street.jpg
  02-Golden Hour.jpg
```

```json
{
  "name": "Kodak Portra 400",
  "time": "2026-01-08"
}
```

A photo's display name comes straight from its filename (minus the extension) — rename the file to change it. `time` applies to the whole roll (a roll is one shoot; there's no meaningful per-photo date). Strip order is alphabetical by filename — prefix with numbers (`01-`, `02-`, ...) if you need a specific order.

- `name` — display name, shown as the caption/alt text (roll name for `roll.json`, or the digital sidecar's own `name` field)
- `time` — any date string `Date.parse` understands; used for sort order (newest first)
- `type` — digital sidecars set `"digital"` explicitly; every photo in a roll folder is implicitly `"film"`, with `filmRoll` set to the roll's `name`

On the homepage, digital photos appear in the masonry grid. Film rolls are grouped into 3D 35mm film canisters, all sitting together in one shared Three.js / React Three Fiber scene ([`src/components/FilmScene.tsx`](src/components/FilmScene.tsx)):

1. **Overview** — every roll's canister sits in one wide shot, each peeking a preview frame.
2. **Select** — click a canister (or its peeking strip) and the camera flies in to focus on that roll; the others sink out of view until you back out. A "← All rolls" button (or the Escape key) flies back out and retracts the roll's strip.
3. **Pull** — once focused, the strip auto-extends to show every frame (alphabetical by filename); drag to pull it further or push it back in; the camera pans to follow the leading edge.
4. **Inspect** — click a revealed frame to open a detail popup with its name, date, and film roll.

[`FilmRollsExplorer.tsx`](src/components/FilmRollsExplorer.tsx) holds the selection/heading state and the info modal, and lazy-loads `FilmScene` client-side only (`next/dynamic` with `ssr: false`) since WebGL isn't available during static export.

Supported image extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. `src/lib/photos.ts` reads this folder at build time, validates each JSON file, and reads each image's actual pixel dimensions — you don't need to specify width/height. A missing image, missing field, or invalid `type` fails the build with a message pointing at the offending file.

## Build

```bash
npm run build
```

Static output is written to `out/`.

## Deploy

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the site and publishes it to GitHub Pages. Enable Pages for this repo under **Settings → Pages → Source: GitHub Actions**, and the site will be available at `https://<username>.github.io/Portfolio/`.
