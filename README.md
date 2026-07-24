# Portfolio

Personal photography portfolio, built with Next.js (App Router) and Tailwind CSS, deployed as a static site to GitHub Pages.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding photos

Drop images in `public/photos/` and reference them in `src/data/photos.ts` (e.g. `/photos/my-shot.jpg`). The placeholder entries use remote sample images — replace them with your own work.

## Build

```bash
npm run build
```

Static output is written to `out/`.

## Deploy

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the site and publishes it to GitHub Pages. Enable Pages for this repo under **Settings → Pages → Source: GitHub Actions**, and the site will be available at `https://<username>.github.io/Portfolio/`.
