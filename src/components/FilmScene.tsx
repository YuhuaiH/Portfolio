"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { FilmRoll, Photo } from "@/lib/photos";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const CAN_RADIUS = 0.34;
// ISO 1007 (135 / 35mm cartridge) reference dimensions, in mm, scaled into
// scene units via MM_TO_UNIT. CAN_RADIUS anchors the real 12.5mm body
// radius (25mm diameter) since it's load-bearing for roll spacing
// elsewhere in this file — every other canister dimension derives from it,
// so the whole shape stays true to the real proportions.
const MM_TO_UNIT = CAN_RADIUS / 12.5;
const CAN_BODY_H = 39.4 * MM_TO_UNIT;
const CAN_TOP_SPOOL_H = 4.5 * MM_TO_UNIT;
const CAN_TOP_SPOOL_R = (10.0 / 2) * MM_TO_UNIT;
const CAN_BOTTOM_SPOOL_H = 3.4 * MM_TO_UNIT;
const CAN_BOTTOM_SPOOL_R = (10.0 / 2) * MM_TO_UNIT;
const FRAME_H = 1.0;
// A single real mm-to-scene-unit scale, anchored on the 35mm strip width
// mapping to FRAME_H, used for every film-strip dimension below (frame
// pitch, image-clear margin, perforation size/spacing) so they all stay
// in one consistent real proportion. Frame width and the perforation
// scale used to each be derived from their own, mismatched conversion,
// which left photos rendering far narrower than their slot — a gap
// between frames much bigger than real 135 film has.
const FILM_MM_TO_UNIT = FRAME_H / 35;
// 36mm real frame advance/pitch.
const FRAME_W = 36 * FILM_MM_TO_UNIT;
// ~1.5mm true gap between frames on the strip.
const FRAME_GAP = 1.5 * FILM_MM_TO_UNIT;
const FRAME_SPACING = FRAME_W + FRAME_GAP;
// Real 135 film: a 35mm-wide strip split into a 24mm image area (68.6%)
// down the middle, flanked by 5.5mm perforation margins (31.4% total) —
// this is what keeps the photo itself clear of the sprocket holes instead
// of letting it grow tall enough to run into them.
const PERF_MARGIN_H = 5.5 * FILM_MM_TO_UNIT;
const PHOTO_MAX_W = FRAME_W;
const PHOTO_MAX_H = 24 * FILM_MM_TO_UNIT;
// Before the flat, interactive strip begins, a short "wrap" mesh — always
// visible, unaffected by pulling — sits flush against the canister's own
// outer surface (same radius, offset out by a hair to avoid z-fighting)
// and sweeps from directly behind the can (WRAP_START_ANGLE) around to
// the tangent point on its right edge (WRAP_END_ANGLE), where the flat
// strip picks up. Standard math convention: angle 0 = +X (right, the
// tangent point), increasing counterclockwise, so 3π/2 is straight back
// (-Z, away from the camera). Most of the sweep sits behind the can's own
// front surface and is naturally hidden by it — exactly the point, since
// the strip is meant to read as emerging from behind the roll rather than
// bolted flat onto its front.
const WRAP_RADIUS_OFFSET = 0.006;
const WRAP_START_ANGLE = (Math.PI * 3) / 2;
const WRAP_END_ANGLE = Math.PI * 2;
const WRAP_RADIUS = CAN_RADIUS + WRAP_RADIUS_OFFSET;
const SLOT_X = WRAP_RADIUS;
// Real 135-format perforations: 2.8mm × 1.9mm rectangles on a 4.74mm pitch,
// running continuously down the whole strip at the correct spacing, rather
// than a fixed count squeezed into each frame.
const SPROCKET_PITCH = 4.74 * FILM_MM_TO_UNIT;
const SPROCKET_W = 2.8 * FILM_MM_TO_UNIT;
const SPROCKET_H = 1.9 * FILM_MM_TO_UNIT;
// Real film base is a fraction of a millimeter thick — this is nowhere
// near that, but it's thin enough for the punched sprocket holes to read
// as slits rather than the boxy tunnels a thicker ribbon produced.
const RIBBON_DEPTH = 0.01;
const FRAME_Z = RIBBON_DEPTH / 2 + 0.01;
const ROLL_GAP = 1.1;
const BREATH_AMPLITUDE = 0.25;
const CLICK_DRAG_THRESHOLD = 6;
const DRAG_SCALE = 0.006;
// Extending (selecting) stays slow and deliberate, ~2.5s to settle — the
// camera is tracking the growing edge in a tight zoom the whole time, which
// reads as plenty quick on its own.
const PULL_EXTEND_LERP = 0.02;
// Retracting (deselecting) has no such camera magnification — the camera
// has already cut to the wide overview — so it needs its own faster pace,
// ~1s to settle, to feel like it matches the extend rather than dragging.
const PULL_RETRACT_LERP = 0.05;
// How far a non-focused roll sinks to get out of the focused camera's much
// tighter frustum — well clear of it even at the closest zoom (camZ ~3.1).
const PARK_Y_OFFSET = -7;
// Deliberately slower than PULL_RETRACT_LERP: on deselect, a parked
// neighbor must still be out of the way for as long as the just-deselected
// roll's strip is still retracting toward it, or the two overlap mid-glide.
const PARK_LERP = 0.04;
// Following the focused roll's growing edge is snappy and reactive...
const CAMERA_FOCUS_LERP = 0.08;
// ...but snapping straight to the wide overview target the instant you
// deselect made the pan back feel abrupt — a much gentler ease here spreads
// that big jump in target position/zoom out instead of lurching toward it.
const CAMERA_OVERVIEW_LERP = 0.035;

type RollState = {
  roll: FilmRoll;
  index: number;
  baseX: number;
  totalLength: number;
  minPulled: number;
  clipPlane: THREE.Plane;
  pulledRef: { current: number };
  displayPulledRef: { current: number };
  hasInteractedRef: { current: boolean };
};

function buildRollStates(filmRolls: FilmRoll[]): RollState[] {
  // Every canister sits at a fixed spacing apart. Unfocused rolls always
  // rest at minPulled, so that (not the longest roll's full unrolled
  // length) is what determines how tightly rolls can sit during selection —
  // a fully pulled-out strip only exists for the one roll in focus, whose
  // neighbors are out of frame by the time the camera zooms in on it.
  const minPulled = SLOT_X + FRAME_GAP + FRAME_SPACING * 0.35;
  const spacing = minPulled + ROLL_GAP;

  return filmRolls.map((roll, index) => {
    const totalLength = SLOT_X + FRAME_GAP + roll.photos.length * FRAME_SPACING + FRAME_GAP;
    const baseX = index * spacing;

    return {
      roll,
      index,
      baseX,
      totalLength,
      minPulled,
      clipPlane: new THREE.Plane(new THREE.Vector3(-1, 0, 0), baseX + minPulled),
      pulledRef: { current: minPulled },
      displayPulledRef: { current: minPulled },
      hasInteractedRef: { current: false },
    };
  });
}

function fitContain(aspect: number, maxW: number, maxH: number) {
  const boxAspect = maxW / maxH;
  return aspect > boxAspect
    ? { w: maxW, h: maxW / aspect }
    : { w: maxH * aspect, h: maxH };
}

// A faint mottled roughness variation for the canister's glossy black
// plastic parts (cap, shoulder, base) — just enough to avoid a perfectly
// flat CG sheen, without reading as brushed metal.
function createPlasticRoughnessMap() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#363636";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.06})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Repeating film-base texture for the ribbon — subtle grain plus a thin
// printed tick near each edge, like the faint manufacturer marks a real
// negative's base carries, instead of one flat solid color.
function createFilmBaseTexture() {
  const w = 128;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#221d17";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(w * 0.46, h * 0.05, w * 0.08, h * 0.045);
  ctx.fillRect(w * 0.46, h * 0.905, w * 0.08, h * 0.045);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A small rounded-rect path, used as a shape hole below — real perforations
// have softly rounded corners rather than sharp ones.
function roundedRectPath(cx: number, cy: number, w: number, h: number, r: number) {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const path = new THREE.Path();
  path.moveTo(cx - hw + rr, cy - hh);
  path.lineTo(cx + hw - rr, cy - hh);
  path.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + rr);
  path.lineTo(cx + hw, cy + hh - rr);
  path.quadraticCurveTo(cx + hw, cy + hh, cx + hw - rr, cy + hh);
  path.lineTo(cx - hw + rr, cy + hh);
  path.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - rr);
  path.lineTo(cx - hw, cy - hh + rr);
  path.quadraticCurveTo(cx - hw, cy - hh, cx - hw + rr, cy - hh);
  return path;
}

// The ribbon mesh's sprocket holes are cut all the way through the
// geometry — real perforations you can see the scene through — rather than
// a light-colored patch sitting on top of an opaque strip.
function buildRibbonGeometry(ribbonLength: number, holeLocalXs: number[], holeY: number) {
  const halfL = ribbonLength / 2;
  const halfH = FRAME_H / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfL, -halfH);
  shape.lineTo(halfL, -halfH);
  shape.lineTo(halfL, halfH);
  shape.lineTo(-halfL, halfH);
  shape.lineTo(-halfL, -halfH);

  const holeRadius = Math.min(SPROCKET_W, SPROCKET_H) * 0.28;
  for (const x of holeLocalXs) {
    shape.holes.push(roundedRectPath(x, holeY, SPROCKET_W, SPROCKET_H, holeRadius));
    shape.holes.push(roundedRectPath(x, -holeY, SPROCKET_W, SPROCKET_H, holeRadius));
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: RIBBON_DEPTH,
    bevelEnabled: false,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -RIBBON_DEPTH / 2);
  return geometry;
}

// A ribbon that hugs the canister's own outer surface (constant radius)
// while sweeping from startAngle to endAngle, instead of cutting a flat
// plane through its body — so the hidden portion is genuinely tracing the
// can's curved exterior, not floating inside its interior volume.
function buildWrapGeometry(radius: number, startAngle: number, endAngle: number, frameH: number) {
  const segments = 24;
  const geometry = new THREE.PlaneGeometry(1, frameH, segments, 1);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5; // 0 at the start angle, 1 at the tangent point
    const angle = startAngle + (endAngle - startAngle) * u;
    pos.setX(i, radius * Math.cos(angle));
    pos.setZ(i, radius * Math.sin(angle));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// Cylindrical paper-label wrap for the canister body — the roll's name,
// date, and a "35mm FILM" line, wrapping around the can the way a real
// canister's label does, rather than sitting flat on top of it.
function createLabelWrapTexture(name: string, time: string) {
  const w = 640;
  const h = 500;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Vertical band layout — a narrow color spine plus a wider main field,
  // both running the full height, with the text rotated to read up the
  // can rather than around it. That's how the reference labels are laid
  // out; a horizontal band split read as facing the wrong way.
  const stripeW = w * 0.24;
  ctx.fillStyle = "#2a5599";
  ctx.fillRect(0, 0, stripeW, h);
  ctx.fillStyle = "#efe8d8";
  ctx.fillRect(stripeW, 0, w - stripeW, h);

  ctx.strokeStyle = "rgba(20,18,16,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(stripeW, 0);
  ctx.lineTo(stripeW, h);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // "35mm FILM", rotated upright in the spine.
  ctx.save();
  ctx.translate(stripeW / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 30px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#f5ede0";
  ctx.fillText("35mm FILM", 0, 0);
  ctx.restore();

  // Roll name, rotated upright, filling most of the main field's height.
  ctx.save();
  ctx.translate(stripeW + (w - stripeW) * 0.4, h / 2);
  ctx.rotate(-Math.PI / 2);
  let nameSize = 92;
  const upperName = name.toUpperCase();
  ctx.font = `bold ${nameSize}px Arial, Helvetica, sans-serif`;
  while (ctx.measureText(upperName).width > h * 0.88 && nameSize > 34) {
    nameSize -= 2;
    ctx.font = `bold ${nameSize}px Arial, Helvetica, sans-serif`;
  }
  ctx.fillStyle = "#1c1712";
  ctx.fillText(upperName, 0, 0);
  ctx.restore();

  // Date, rotated the same way, in its own column near the right edge.
  ctx.save();
  ctx.translate(stripeW + (w - stripeW) * 0.82, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "26px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "rgba(28,23,18,0.65)";
  ctx.fillText(formatRollDate(time).toUpperCase(), 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function formatRollDate(time: string) {
  return new Date(time).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function Canister({
  rollIndex,
  name,
  time,
  showLabel,
}: {
  rollIndex: number;
  name: string;
  time: string;
  showLabel: boolean;
}) {
  const userData = { rollIndex };
  const labelTexture = useMemo(() => createLabelWrapTexture(name, time), [name, time]);
  const plasticRoughness = useMemo(() => createPlasticRoughnessMap(), []);

  // ISO 1007: a single 25mm-diameter body (39.4mm tall) with narrower
  // 10mm-diameter spool extensions projecting above (4.5mm) and below
  // (3.4mm) it — not a tapered "shoulder" down to a separate cap. Only the
  // top portion of the body itself is bare black plastic; the rest is
  // labeled. The body is centered on y=0 so its middle — where the film
  // actually runs — lines up with the strip beside it, regardless of the
  // (slightly unequal) spool extensions above and below.
  const bodyLabelFraction = 0.78;
  const bodyLabelH = CAN_BODY_H * bodyLabelFraction;
  const bodyCapH = CAN_BODY_H - bodyLabelH;
  const bottom = -(CAN_BOTTOM_SPOOL_H + CAN_BODY_H / 2);
  const bottomSpoolY = bottom + CAN_BOTTOM_SPOOL_H / 2;
  const bodyBottom = bottom + CAN_BOTTOM_SPOOL_H;
  const bodyLabelY = bodyBottom + bodyLabelH / 2;
  const bodyCapY = bodyBottom + bodyLabelH + bodyCapH / 2;
  const topSpoolY = bodyBottom + CAN_BODY_H + CAN_TOP_SPOOL_H / 2;
  const topSurfaceY = topSpoolY + CAN_TOP_SPOOL_H / 2;

  const plastic = (roughness = 0.3) => (
    <meshStandardMaterial
      color="#141414"
      roughnessMap={plasticRoughness}
      roughness={roughness}
      metalness={0.15}
    />
  );

  return (
    <group>
      {/* Bottom spool extension. */}
      <mesh position={[0, bottomSpoolY, 0]} userData={userData}>
        <cylinderGeometry args={[CAN_BOTTOM_SPOOL_R, CAN_BOTTOM_SPOOL_R, CAN_BOTTOM_SPOOL_H, 24]} />
        {plastic()}
      </mesh>
      {/* Main body, labeled portion. */}
      <mesh position={[0, bodyLabelY, 0]} userData={userData}>
        <cylinderGeometry args={[CAN_RADIUS, CAN_RADIUS, bodyLabelH, 48]} />
        <meshStandardMaterial
          map={labelTexture}
          color={labelTexture ? "#ffffff" : "#e8e3d5"}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      {/* Main body, bare plastic portion near the top — same diameter as
          the labeled section, no taper. */}
      <mesh position={[0, bodyCapY, 0]} userData={userData}>
        <cylinderGeometry args={[CAN_RADIUS, CAN_RADIUS, bodyCapH, 48]} />
        {plastic()}
      </mesh>
      {/* Top spool extension. */}
      <mesh position={[0, topSpoolY, 0]} userData={userData}>
        <cylinderGeometry args={[CAN_TOP_SPOOL_R, CAN_TOP_SPOOL_R, CAN_TOP_SPOOL_H, 24]} />
        {plastic(0.25)}
      </mesh>
      {/* Spool hole — a flat dark disc right at the top face reads as a
          recessed opening without needing real recessed geometry. */}
      <mesh position={[0, topSurfaceY + 0.003, 0]} userData={userData}>
        <cylinderGeometry args={[CAN_TOP_SPOOL_R * 0.55, CAN_TOP_SPOOL_R * 0.55, 0.006, 20]} />
        <meshStandardMaterial color="#000000" roughness={0.8} />
      </mesh>
      <Html position={[0, topSurfaceY + 0.2, 0]} center style={{ pointerEvents: "none" }}>
        <div
          className={`flex flex-col items-center whitespace-nowrap rounded-2xl border border-white/25 bg-black/60 px-3 py-1.5 text-center backdrop-blur-sm transition-opacity duration-300 ${
            showLabel ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="font-heading text-[11px] uppercase tracking-[0.15em] text-white/90">
            {name}
          </span>
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/50">
            {formatRollDate(time)}
          </span>
        </div>
      </Html>
    </group>
  );
}

function Frame({
  photo,
  x,
  clipPlane,
  rollIndex,
}: {
  photo: Photo;
  x: number;
  clipPlane: THREE.Plane;
  rollIndex: number;
}) {
  const texture = useTexture(`${BASE_PATH}${photo.src}`);
  texture.colorSpace = THREE.SRGBColorSpace;

  // Portrait photos get turned sideways to fill the same landscape frame
  // slot as everything else on the strip — fit against the swapped box so
  // the un-rotated plane is sized for a 90° turn, then actually turn it.
  // The detail popup (a plain <Image>) is unaffected and shows it upright.
  const isPortrait = photo.height > photo.width;
  const { w, h } = useMemo(() => {
    const aspect = photo.width / photo.height;
    return isPortrait
      ? fitContain(aspect, PHOTO_MAX_H, PHOTO_MAX_W)
      : fitContain(aspect, PHOTO_MAX_W, PHOTO_MAX_H);
  }, [photo.width, photo.height, isPortrait]);

  return (
    <mesh
      position={[x, 0, FRAME_Z]}
      rotation={isPortrait ? [0, 0, Math.PI / 2] : [0, 0, 0]}
      userData={{ photo, rollIndex, isStrip: true }}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} clippingPlanes={[clipPlane]} />
    </mesh>
  );
}

function FilmStrip({ rs }: { rs: RollState }) {
  const { roll, clipPlane, totalLength, index } = rs;
  const ribbonLength = totalLength - SLOT_X;
  const holeY = FRAME_H / 2 - PERF_MARGIN_H / 2;

  const ribbonTexture = useMemo(() => {
    const t = createFilmBaseTexture();
    if (t) t.repeat.set(ribbonLength / 0.3, 1);
    return t;
  }, [ribbonLength]);

  // Perforations run continuously down the whole strip at the real pitch —
  // not clustered per frame with the gaps skipped — the way an actual
  // negative's sprocket holes do. Kept in local (mesh-relative) coordinates
  // since they feed straight into the ribbon geometry below; a hole is
  // dropped if it would straddle the strip's cut ends, since a hole
  // punching through the outer boundary breaks the shape triangulation.
  const holeLocalXs = useMemo(() => {
    const halfL = ribbonLength / 2;
    const margin = SPROCKET_W / 2 + 0.002;
    const xs: number[] = [];
    for (let x = SLOT_X + SPROCKET_PITCH / 2; x < totalLength; x += SPROCKET_PITCH) {
      const local = x - (SLOT_X + halfL);
      if (local - margin >= -halfL && local + margin <= halfL) xs.push(local);
    }
    return xs;
  }, [totalLength, ribbonLength]);

  const ribbonGeometry = useMemo(
    () => buildRibbonGeometry(ribbonLength, holeLocalXs, holeY),
    [ribbonLength, holeLocalXs, holeY]
  );

  const wrapGeometry = useMemo(
    () => buildWrapGeometry(WRAP_RADIUS, WRAP_START_ANGLE, WRAP_END_ANGLE, FRAME_H),
    []
  );
  // Reuses the same grainy film-base look as the main ribbon — a flat solid
  // color read as almost invisible against the dark scene background.
  const wrapTexture = useMemo(() => {
    const t = createFilmBaseTexture();
    const arcLength = WRAP_RADIUS * (WRAP_END_ANGLE - WRAP_START_ANGLE);
    if (t) t.repeat.set(arcLength / 0.3, 1);
    return t;
  }, []);

  return (
    <group>
      <mesh geometry={wrapGeometry} userData={{ rollIndex: index }}>
        <meshStandardMaterial
          map={wrapTexture}
          color={wrapTexture ? "#ffffff" : "#221d17"}
          roughness={0.6}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[SLOT_X + ribbonLength / 2, 0, 0]}
        geometry={ribbonGeometry}
        userData={{ rollIndex: index, isStrip: true }}
      >
        <meshStandardMaterial
          map={ribbonTexture}
          color={ribbonTexture ? "#ffffff" : "#221d17"}
          roughness={0.6}
          metalness={0.05}
          side={THREE.DoubleSide}
          clippingPlanes={[clipPlane]}
        />
      </mesh>

      {roll.photos.map((photo, i) => (
        <Frame
          key={photo.id}
          photo={photo}
          x={SLOT_X + FRAME_GAP + i * FRAME_SPACING + FRAME_W / 2}
          clipPlane={clipPlane}
          rollIndex={index}
        />
      ))}
    </group>
  );
}

function RollGroup({ rs, focusedIndex }: { rs: RollState; focusedIndex: number | null }) {
  // Rolls sit close together, so once one is selected the others glide down
  // out of the focused camera's view instead of crowding it — a real move,
  // not a visibility toggle, so there's nothing to pop in or out abruptly
  // on the way back.
  const groupRef = useRef<THREE.Group>(null);
  const yRef = useRef(0);
  const isFocused = focusedIndex === rs.index;
  const parked = focusedIndex !== null && !isFocused;

  useFrame(() => {
    const targetY = parked ? PARK_Y_OFFSET : 0;
    yRef.current = THREE.MathUtils.lerp(yRef.current, targetY, PARK_LERP);
    groupRef.current?.position.set(rs.baseX, yRef.current, 0);
  });

  return (
    <group ref={groupRef} position={[rs.baseX, 0, 0]}>
      {focusedIndex === null && (
        // A generous, invisible click target spanning this roll's whole
        // lane (edge-to-edge with its neighbors, no gaps or overlap) — the
        // actual canister/strip are thin and easy to miss at overview zoom,
        // so relying on their real geometry alone made selection feel
        // finicky. Sits behind the visible geometry so it never wins a
        // raycast over something actually there; it only matters in the
        // gaps between rendered parts, where nothing else would be hit.
        <mesh position={[0, 0.2, -0.1]} userData={{ rollIndex: rs.index }}>
          <planeGeometry args={[rs.minPulled + ROLL_GAP, 3]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <Canister
        rollIndex={rs.index}
        name={rs.roll.name}
        time={rs.roll.time}
        showLabel={focusedIndex === null}
      />
      <Suspense fallback={null}>
        <FilmStrip rs={rs} />
      </Suspense>
    </group>
  );
}

function SceneController({
  rollStates,
  focusedIndex,
  onSelectRoll,
  onPhotoClick,
}: {
  rollStates: RollState[];
  focusedIndex: number | null;
  onSelectRoll: (index: number | null) => void;
  onPhotoClick: (photo: Photo) => void;
}) {
  const { camera, gl, scene, size } = useThree();
  const draggingRef = useRef(false);
  const startClientRef = useRef({ x: 0, y: 0 });
  const startPulledRef = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const focusedIndexRef = useRef(focusedIndex);

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
    // Selecting a roll auto-extends it partway (the per-frame loop glides
    // it there) — only halfway, not all the way out. Fully revealing every
    // frame automatically left nothing for the viewer to actually pull;
    // stopping at the midpoint still shows there's more roll to go, and
    // leaving hasInteractedRef false keeps the idle breathing animation
    // running on top of it as a "there's more — try pulling" nudge until
    // the viewer actually grabs it.
    if (focusedIndex !== null) {
      const rs = rollStates[focusedIndex];
      rs.pulledRef.current = rs.minPulled + (rs.totalLength - rs.minPulled) * 0.5;
    }
  }, [focusedIndex, rollStates]);

  useEffect(() => {
    const dom = gl.domElement;
    dom.style.touchAction = "none";
    dom.style.cursor = "grab";

    function onPointerDown(e: PointerEvent) {
      draggingRef.current = true;
      startClientRef.current = { x: e.clientX, y: e.clientY };
      const idx = focusedIndexRef.current;
      startPulledRef.current = idx !== null ? rollStates[idx].pulledRef.current : 0;
      dom.style.cursor = "grabbing";
      dom.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const idx = focusedIndexRef.current;
      if (idx === null) return;
      const rs = rollStates[idx];
      rs.hasInteractedRef.current = true;
      const dx = e.clientX - startClientRef.current.x;
      rs.pulledRef.current = THREE.MathUtils.clamp(
        startPulledRef.current + dx * DRAG_SCALE,
        rs.minPulled,
        rs.totalLength
      );
    }

    function onPointerUp(e: PointerEvent) {
      draggingRef.current = false;
      dom.style.cursor = "grab";
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture already released
      }

      const moved = Math.hypot(
        e.clientX - startClientRef.current.x,
        e.clientY - startClientRef.current.y
      );
      if (moved > CLICK_DRAG_THRESHOLD) return;

      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(ndc, camera);
      const idx = focusedIndexRef.current;
      const hits = raycaster.intersectObjects(scene.children, true);

      for (const hit of hits) {
        const data = hit.object.userData as {
          photo?: Photo;
          rollIndex?: number;
          isStrip?: boolean;
        };
        if (data.rollIndex === undefined) continue;

        // The ribbon/sprocket/frame geometry always spans a roll's full
        // length — only the shader clip plane hides the part that isn't
        // pulled out yet, which raycasting ignores entirely. Without this
        // check, a click can "see through" to a neighboring roll's
        // still-invisible tail sitting at the same world position and
        // select the wrong roll. The canister itself is never clipped, so
        // it's exempt.
        const rs = rollStates[data.rollIndex];
        if (data.isStrip && hit.point.x > rs.clipPlane.constant + 0.02) continue;

        if (data.photo && idx === data.rollIndex) {
          onPhotoClick(data.photo);
          return;
        }

        if (idx === null) {
          onSelectRoll(data.rollIndex);
        }
        return;
      }

      if (idx !== null) onSelectRoll(null);
    }

    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerUp);

    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointercancel", onPointerUp);
    };
  }, [gl, camera, scene, raycaster, rollStates, onSelectRoll, onPhotoClick]);

  useFrame(({ clock }) => {
    const idx = focusedIndexRef.current;
    for (const rs of rollStates) {
      const isFocused = idx === rs.index;

      // Auto-recover: the instant a roll isn't focused anymore, drop its
      // pulled state back to resting so it doesn't stay stuck out (and
      // risk overlapping a neighbor) after you look away.
      if (!isFocused) {
        rs.pulledRef.current = rs.minPulled;
        rs.hasInteractedRef.current = false;
      }

      let target = rs.pulledRef.current;
      // Only the roll the viewer can actually see (nothing focused yet, or
      // this is the focused one) breathes — an unfocused, hidden roll
      // pulsing its strip out serves no purpose and risks nudging into its
      // neighbor.
      const canBreathe = idx === null || isFocused;
      if (!rs.hasInteractedRef.current && canBreathe) {
        target += Math.max(0, Math.sin(clock.elapsedTime * 1.2 + rs.index * 0.7)) * BREATH_AMPLITUDE;
      }

      // Snap 1:1 while actively dragging the focused roll; otherwise glide
      // toward the target (this is what makes the recovery-to-rest smooth).
      const snap = isFocused && draggingRef.current;
      const lerpFactor = isFocused ? PULL_EXTEND_LERP : PULL_RETRACT_LERP;
      rs.displayPulledRef.current = snap
        ? target
        : THREE.MathUtils.lerp(rs.displayPulledRef.current, target, lerpFactor);

      rs.clipPlane.constant = rs.baseX + rs.displayPulledRef.current;
    }

    // How far back the camera needs to sit to fit a given half-width
    // depends on the canvas's current aspect ratio, not just a constant —
    // the old fixed multipliers here were tuned against a wide desktop
    // canvas and clipped photos off both edges on a narrow phone screen,
    // where the same vertical FOV covers much less horizontal ground.
    const vFov = THREE.MathUtils.degToRad(
      camera instanceof THREE.PerspectiveCamera ? camera.fov : 45
    );
    const aspect = size.width / Math.max(size.height, 1);
    const camZForHalfWidth = (halfWidth: number, minZ: number) =>
      Math.max(halfWidth / (Math.tan(vFov / 2) * Math.max(aspect, 0.001)), minZ);

    if (idx === null) {
      const last = rollStates[rollStates.length - 1];
      // The first canister's own body sits partly to the left of x=0 (its
      // center), so the true left edge isn't 0 — leaving it out understated
      // the width and skewed the centering enough to clip that roll's edge
      // on narrow viewports.
      const leftEdge = -CAN_RADIUS;
      const rightEdge = last.baseX + last.minPulled;
      const targetX = (leftEdge + rightEdge) / 2;
      const camZ = camZForHalfWidth((rightEdge - leftEdge) / 2 + 1.1, 4.5);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, CAMERA_OVERVIEW_LERP);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.5, CAMERA_OVERVIEW_LERP);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, CAMERA_OVERVIEW_LERP);
      camera.lookAt(targetX, 0.2, 0);
    } else {
      const rs = rollStates[idx];
      const display = rs.clipPlane.constant - rs.baseX;
      const halfWidth = Math.min(rs.totalLength, 6) / 2 + 0.5;
      const camZ = camZForHalfWidth(halfWidth, 3.1);
      // Centering on the midpoint between the canister and the growing tip
      // works fine while there's not much strip out yet, but on a long roll
      // (5+ photos) that midpoint keeps drifting right while the zoom stays
      // capped — eventually pushing the tip you're actually dragging
      // outside the frame. Past a certain point, switch to tracking a
      // window anchored on the tip instead (with a little margin so it
      // isn't flush against the edge), so the part you interact with is
      // always in view regardless of how long the roll is.
      const midpointX = display / 2;
      const tipAnchoredX = display - halfWidth + 0.4;
      const targetX = rs.baseX + Math.max(midpointX, tipAnchoredX);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, CAMERA_FOCUS_LERP);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.75, CAMERA_FOCUS_LERP);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, CAMERA_FOCUS_LERP);
      camera.lookAt(targetX, 0.05, 0);
    }
  });

  return null;
}

export default function FilmScene({
  filmRolls,
  focusedIndex,
  onSelectRoll,
  onPhotoClick,
}: {
  filmRolls: FilmRoll[];
  focusedIndex: number | null;
  onSelectRoll: (index: number | null) => void;
  onPhotoClick: (photo: Photo) => void;
}) {
  const rollStates = useMemo(() => buildRollStates(filmRolls), [filmRolls]);
  const last = rollStates[rollStates.length - 1];
  const initialWidth = last.baseX + last.minPulled;

  return (
    <Canvas
      camera={{ position: [initialWidth / 2, 1.5, 4.5 + initialWidth * 0.32], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 5, 6]} intensity={1.1} />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <directionalLight position={[0, -2, 4]} intensity={0.25} />
      {rollStates.map((rs) => (
        <RollGroup key={rs.roll.id} rs={rs} focusedIndex={focusedIndex} />
      ))}
      <SceneController
        rollStates={rollStates}
        focusedIndex={focusedIndex}
        onSelectRoll={onSelectRoll}
        onPhotoClick={onPhotoClick}
      />
    </Canvas>
  );
}
