import type { Metadata } from "next";
import site from "@/data/site.json";
import aboutBlocks from "@/data/about.json";
import ContentBlocks from "@/components/ContentBlocks";
import AboutHero from "@/components/AboutHero";
import type { ContentBlock } from "@/lib/content";

export const metadata: Metadata = {
  title: `About — ${site.name}`,
};

export default function About() {
  return (
    <section className="px-6 py-12 text-center sm:px-12">
      <AboutHero />
      <div className="mx-auto mt-12 max-w-xl sm:mt-16">
        <ContentBlocks blocks={aboutBlocks as ContentBlock[]} />
      </div>
    </section>
  );
}
