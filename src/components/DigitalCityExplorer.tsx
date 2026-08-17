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
    <section className="mb-16">
      {/* The heading + film/digital switcher live in SceneHeader (rendered
          once in layout.tsx) rather than here. Same footprint as the scene
          it replaces (h-[560px]/h-[680px]) so the page doesn't jump when
          this comes back. */}
      <div className="mt-6 flex h-[560px] w-full items-center justify-center border border-accent-bright/15 bg-background sm:mt-8 sm:h-[680px]">
        <p className="font-heading text-2xl text-foreground italic sm:text-3xl">Coming Soon</p>
      </div>
    </section>
  );
}
