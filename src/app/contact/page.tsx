import type { Metadata } from "next";
import site from "@/data/site.json";

export const metadata: Metadata = {
  title: `Contact — ${site.name}`,
};

export default function Contact() {
  return (
    <section className="mx-auto max-w-xl px-6 py-12 text-center sm:px-12">
      <h1 className="font-heading text-2xl tracking-wide">Contact</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted">
        For bookings and inquiries, reach out at{" "}
        <a
          href={`mailto:${site.email}`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {site.email}
        </a>
        .
      </p>
    </section>
  );
}
