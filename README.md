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

Each photo lives in `public/photos/` as an image file plus a JSON sidecar with the same base name, e.g.:

```text
public/photos/golden-gate-dusk.jpg
public/photos/golden-gate-dusk.json
```

The JSON file holds the photo's metadata:

```json
{
  "name": "Golden Gate at Dusk",
  "time": "2026-03-14",
  "type": "digital"
}
```

```json
{
  "name": "Market Street",
  "time": "2026-01-08",
  "type": "film",
  "filmRoll": "Kodak Portra 400"
}
```

- `name` — display name, shown as the caption and alt text
- `time` — any date string `Date.parse` understands; used for sort order (newest first)
- `type` — `"film"` or `"digital"`
- `filmRoll` — required when `type` is `"film"`, ignored otherwise

Supported image extensions: `.jpg`, `.jpeg`, `.png`, `.webp`. `src/lib/photos.ts` reads this folder at build time, validates each JSON file, and reads the image's actual pixel dimensions — you don't need to specify width/height. A missing image, missing field, or invalid `type` fails the build with a message pointing at the offending file.

## Build

```bash
npm run build
```

Static output is written to `out/`.

## Deploy

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the site and publishes it to GitHub Pages. Enable Pages for this repo under **Settings → Pages → Source: GitHub Actions**, and the site will be available at `https://<username>.github.io/Portfolio/`.
