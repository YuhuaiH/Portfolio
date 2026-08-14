import homeData from "@/data/home.json";
import EyeHero from "@/components/EyeHero";

// No page-specific <title>/<description> here — the root layout's already
// read exactly right for "/" (site name — role), so this just inherits it.
export default function Home() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-4 text-center sm:px-12">
      <EyeHero boxes={homeData.boxes} />
    </section>
  );
}
