import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import site from "@/data/site.json";
import { TONES, INK } from "@/components/SpecCard";

// The link-preview image (Discord, iMessage, Slack, X…), rendered once at
// build time to a real out/og.png and referenced as og:image/twitter:image
// in layout.tsx. A route handler rather than Next's opengraph-image file
// convention: under static export that convention writes an extensionless
// "opengraph-image" file (GitHub Pages then serves it with the wrong
// content type) and its generated URL drops the /Portfolio basePath. Drawn in the
// site's own language rather than a screenshot: the dark scene with its
// warm gold haze, the name in the display face, and one mini spec ticket
// per section in that section's color.
export const dynamic = "force-static";

export const OG_SIZE = { width: 1200, height: 630 };

// The same faces the site loads through next/font, as local files: the
// image renderer can't use next/font, and fetching from Google at build
// time would make the build depend on the network.
const font = (file: string) => fs.readFileSync(path.join(process.cwd(), "src/app/fonts", file));

const TICKETS = [
  { label: "Projects", tone: TONES.projects },
  { label: "Photography", tone: TONES.photography },
  { label: "Audio", tone: TONES.audio },
  { label: "Graphic", tone: TONES.graphic },
];

// A few fixed bars, standing in for the tickets' barcodes.
const BARS = [3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#040403",
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(217,192,138,0.20), rgba(217,192,138,0.05) 45%, rgba(4,4,3,0) 75%)",
          color: "#f1ebc6",
          fontFamily: "Space Grotesk",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(241,235,198,0.6)",
          }}
        >
          <span>Portfolio</span>
          <span>yuhuaih.github.io</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Unbounded",
              fontSize: 104,
              lineHeight: 1,
              letterSpacing: -3,
              textTransform: "uppercase",
              color: "#f3e6c4",
            }}
          >
            {site.fullName}
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 34,
              fontWeight: 500,
              color: "rgba(241,235,198,0.75)",
            }}
          >
            {site.role}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {TICKETS.map((ticket, i) => (
            <div
              key={ticket.label}
              style={{
                flex: 1,
                height: 118,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "14px 18px 12px",
                borderRadius: 20,
                backgroundColor: ticket.tone,
                color: INK,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Unbounded", fontSize: 18 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ display: "flex", gap: 2, height: 16 }}>
                  {BARS.map((w, b) => (
                    <div key={b} style={{ width: w, height: 16, backgroundColor: INK }} />
                  ))}
                </div>
              </div>
              {/* Label on its own ruled row: "PHOTOGRAPHY" needs the full
                  width of a quarter-width ticket at this size. */}
              <div
                style={{
                  display: "flex",
                  borderTop: `2px solid ${INK}`,
                  paddingTop: 8,
                  fontFamily: "Unbounded",
                  fontSize: 18,
                  letterSpacing: -0.5,
                  textTransform: "uppercase",
                }}
              >
                {ticket.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Unbounded", data: font("unbounded-latin-900-normal.woff"), weight: 900 },
        { name: "Space Grotesk", data: font("space-grotesk-latin-500-normal.woff"), weight: 500 },
        { name: "Space Grotesk", data: font("space-grotesk-latin-700-normal.woff"), weight: 700 },
      ],
    }
  );
}
