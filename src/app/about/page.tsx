import type { Metadata } from "next";
import site from "@/data/site.json";
import about from "@/data/about.json";
import AboutHero from "@/components/AboutHero";

export const metadata: Metadata = {
  title: `About — ${site.name}`,
};

// The introduction lives in src/data/about.json, split to fit the page's
// symmetry: "title" (centered under the portrait), "left" and "right" (the
// two mirrored halves either side of the center line), and "contact" (the
// last line). All support [label](url) links and {{email}} (see content.tsx).
export default function About() {
  return <AboutHero title={about.title} left={about.left} right={about.right} contact={about.contact} />;
}
