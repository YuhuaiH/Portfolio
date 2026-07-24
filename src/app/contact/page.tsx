import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Your Name",
};

export default function Contact() {
  return (
    <section className="max-w-2xl px-6 py-12 sm:px-12">
      <h1 className="text-2xl font-light">Contact</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600">
        For bookings and inquiries, reach out at{" "}
        <a
          href="mailto:you@example.com"
          className="underline underline-offset-2 hover:opacity-70"
        >
          you@example.com
        </a>
        .
      </p>
    </section>
  );
}
