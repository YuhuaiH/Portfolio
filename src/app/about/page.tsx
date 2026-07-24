import type { Metadata } from "next";
import site from "@/data/site.json";

export const metadata: Metadata = {
  title: `About — ${site.name}`,
};

export default function About() {
  return (
    <section className="mx-auto max-w-xl px-6 py-12 text-center sm:px-12">
      <h1 className="font-heading text-2xl tracking-wide">About</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted">{site.bio}</p>
    </section>
  );
}
