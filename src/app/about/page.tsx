import type { Metadata } from "next";
import site from "@/data/site.json";
import aboutBlocks from "@/data/about.json";
import ContentBlocks from "@/components/ContentBlocks";
import type { ContentBlock } from "@/lib/content";

export const metadata: Metadata = {
  title: `About — ${site.name}`,
};

export default function About() {
  return (
    <section className="mx-auto max-w-xl px-6 py-12 text-center sm:px-12">
      <ContentBlocks blocks={aboutBlocks as ContentBlock[]} />
    </section>
  );
}
