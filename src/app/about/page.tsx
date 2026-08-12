import type { Metadata } from "next";
import site from "@/data/site.json";
import aboutData from "@/data/about.json";
import AboutHero from "@/components/AboutHero";

export const metadata: Metadata = {
  title: `About — ${site.name}`,
};

export default function About() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12 text-center sm:px-12">
      <h1 className="font-heading text-2xl tracking-wide">{aboutData.heading}</h1>
      <AboutHero boxes={aboutData.boxes} />
    </section>
  );
}
