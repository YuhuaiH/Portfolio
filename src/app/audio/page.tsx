import type { Metadata } from "next";
import RecordShelf from "@/components/RecordShelf";
import { SectionHeader } from "@/components/WorkIndex";
import site from "@/data/site.json";
import { getRecords } from "@/lib/records";

export const metadata: Metadata = {
  title: `Audio — ${site.name}`,
};

// Records come from public/audio/ (one folder per record — see
// src/lib/records.ts), not a JSON list like Projects/Graphic.
export default async function AudioPage() {
  const records = await getRecords();
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-4 pb-12 font-label sm:px-12">
      <SectionHeader section="audio" count={records.length} noun={["record", "records"]} />
      <RecordShelf records={records} />
    </section>
  );
}
