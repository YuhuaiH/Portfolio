// DigitalCityScene (the reflective 3D billboard) is disabled for now — its
// MeshReflectorMaterial renders the whole scene a second time into a
// 1024×1024 buffer plus a two-pass blur, every single frame, which was the
// single most expensive thing on the site (see the performance audit this
// replaced). Not deleted, just not mounted: swap the "Coming Soon" block
// below back out for <DigitalCityScene photos={photos} onSelect={...} />
// (see git history / DigitalCityScene.tsx, still present) once that cost
// is addressed.
export default function DigitalCityExplorer() {
  return (
    // mb-2 + a shorter box (h-[320px]/[400px], down from 560/680 —
    // matches FilmRollsExplorer.tsx's own fix) rather than keeping the
    // disabled scene's full footprint: there's no scene to reserve room
    // for anymore, and the old height combined with mb-16 stacking on
    // this page's own pb-16 pushed the page past one viewport, the same
    // bug fixed on /work.
    <section className="mb-2">
      {/* The heading + film/digital switcher live in SceneHeader (rendered
          once in layout.tsx) rather than here. */}
      <div className="mt-6 flex h-[320px] w-full items-center justify-center border border-accent-bright/15 bg-background sm:mt-8 sm:h-[400px]">
        <p className="font-heading text-2xl text-foreground italic sm:text-3xl">Coming Soon</p>
      </div>
    </section>
  );
}
