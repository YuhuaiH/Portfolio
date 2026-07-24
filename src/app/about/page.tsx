import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Your Name",
};

export default function About() {
  return (
    <section className="max-w-2xl px-6 py-12 sm:px-12">
      <h1 className="text-2xl font-light">About</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600">
        A short bio goes here — who you are, what you shoot, and what draws
        you to it. Replace this placeholder text in{" "}
        <code>src/app/about/page.tsx</code>.
      </p>
    </section>
  );
}
