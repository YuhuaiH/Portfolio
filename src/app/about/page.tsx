import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Your Name",
};

export default function About() {
  return (
    <section className="mx-auto max-w-xl px-6 py-12 text-center sm:px-12">
      <h1 className="font-heading text-2xl tracking-wide">About</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted">
        A short bio goes here — who you are, what you shoot, and what draws
        you to it. Replace this placeholder text in{" "}
        <code>src/app/about/page.tsx</code>.
      </p>
    </section>
  );
}
