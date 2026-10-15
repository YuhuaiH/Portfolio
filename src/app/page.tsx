import homeData from "@/data/home.json";
import EyeHero from "@/components/EyeHero";

// No page-specific <title>/<description> here — the root layout's already
// read exactly right for "/" (site name — role), so this just inherits it.
export default function Home() {
  return (
    // lg+: no header above the hero on this page (the name is the wordmark
    // behind the eye instead), so center the hero in the viewport — minus
    // roughly the footer's height — rather than leaving it pinned to the top.
    <section className="mx-auto max-w-5xl px-6 py-4 text-center sm:px-12">
      <EyeHero tickets={homeData.tickets} />
    </section>
  );
}
