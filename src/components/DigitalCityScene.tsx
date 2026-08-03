"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial, PerspectiveCamera, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Photo } from "@/lib/photos";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// A single, restrained neon tone for the billboard's frame — one delicate
// accent rather than the scattered rainbow of a whole billboard field.
const BILLBOARD_COLOR = "#02171b";
const BILLBOARD_WIDTH = 8.6;
const BILLBOARD_HEIGHT = 5.1;
// A real picture-frame border and backing slab around the poster, each with
// actual depth, so the sign reads as a physical box rather than a flat card.
const FRAME_THICKNESS = 0.2;
const FRAME_DEPTH = 0.24;
const BACK_PANEL_DEPTH = 0.14;
// Tall enough that the support poles below read as genuine stilts holding
// a real roadside sign up, not just a couple of short legs.
const BILLBOARD_LIFT = 2.2;
const POLE_RADIUS = 0.11;
// The billboard group's own vertical center — shared with the camera below
// so the low-angle shot below is aimed at the panel's actual middle.
const BILLBOARD_CENTER_Y = BILLBOARD_HEIGHT / 2 + BILLBOARD_LIFT;
const SLIDE_SECONDS = 4.5;
const CROSSFADE_SECONDS = 1.2;

// A warm magenta glow bleeding out from directly behind the billboard —
// the "atmospheric back light" the panel is silhouetted against, echoing
// the same pink/violet tones already in the night sky.
const BACKLIGHT_RGB = "255,45,210";
const BACKLIGHT_COLOR = "#ff2dd2";

// Camera sits low, near ground level, and pitches up to the billboard's
// center — a deliberate low-angle "hero shot" instead of looking at it
// straight on, which reads as flatter and less cinematic.
const CAMERA_Y = 3.1;
const CAMERA_Z = 7;
const CAMERA_PITCH = Math.atan2(BILLBOARD_CENTER_Y - CAMERA_Y, CAMERA_Z);

function fitContain(aspect: number, maxW: number, maxH: number) {
  const boxAspect = maxW / maxH;
  return aspect > boxAspect ? { w: maxW, h: maxW / aspect } : { w: maxH * aspect, h: maxH };
}

// A moody vertical gradient with a couple of soft glow blobs blended in —
// closer to the uneven glow of real light-polluted city sky than a flat
// linear fade.
function createNightSkyTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#020103");
  grad.addColorStop(0.3, "#09061c");
  grad.addColorStop(0.55, "#170c33");
  grad.addColorStop(0.78, "#2c1140");
  grad.addColorStop(1, "#421638");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const glows: [number, number, number, string][] = [
    [size * 0.28, size * 0.82, size * 0.55, "rgba(255,60,190,0.22)"],
    [size * 0.75, size * 0.9, size * 0.5, "rgba(90,90,255,0.18)"],
    [size * 0.5, size * 0.7, size * 0.6, "rgba(150,60,255,0.14)"],
  ];
  for (const [cx, cy, r, color] of glows) {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function NightSky() {
  const texture = useMemo(() => createNightSkyTexture(), []);
  return texture ? <primitive attach="background" object={texture} /> : null;
}

function ReflectiveGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[200, 200]} />
      <MeshReflectorMaterial
        blur={[350, 120]}
        resolution={1024}
        mixBlur={1}
        mixStrength={35}
        roughness={1}
        depthScale={1}
        minDepthThreshold={0.85}
        maxDepthThreshold={1.4}
        color="#0d0e18"
        metalness={0.3}
        mirror={0}
      />
    </mesh>
  );
}

// A single grid cell (right + bottom edge lines) tiled across the ground —
// the classic synthwave floor grid. The mirror sheen on its own read as an
// undifferentiated black void from a low, close angle; the glowing grid
// lines are what actually make it legible as a ground plane receding into
// the distance rather than empty space.
function createGridTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.strokeStyle = `rgba(${BACKLIGHT_RGB},0.9)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, size - 1);
  ctx.lineTo(size, size - 1);
  ctx.moveTo(size - 1, 0);
  ctx.lineTo(size - 1, size);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function GroundGrid() {
  const texture = useMemo(() => {
    const t = createGridTexture();
    if (t) t.repeat.set(80, 80);
    return t;
  }, []);

  if (!texture) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

// The physical sign box around the poster — four solid, glowing bars
// forming a picture-frame border, plus a dark slab behind the poster
// giving the whole thing real thickness instead of a flat card.
function BillboardFrame() {
  const barMaterial = (
    <meshStandardMaterial
      color="#0d0f14"
      emissive={BILLBOARD_COLOR}
      emissiveIntensity={0.9}
      roughness={0.4}
      metalness={0.3}
    />
  );

  const outerW = BILLBOARD_WIDTH + FRAME_THICKNESS * 2;
  const outerH = BILLBOARD_HEIGHT + FRAME_THICKNESS * 2;

  return (
    <group>
      {/* Top / bottom bars span the full outer width, corner to corner. */}
      <mesh position={[0, BILLBOARD_HEIGHT / 2 + FRAME_THICKNESS / 2, 0]}>
        <boxGeometry args={[outerW, FRAME_THICKNESS, FRAME_DEPTH]} />
        {barMaterial}
      </mesh>
      <mesh position={[0, -(BILLBOARD_HEIGHT / 2 + FRAME_THICKNESS / 2), 0]}>
        <boxGeometry args={[outerW, FRAME_THICKNESS, FRAME_DEPTH]} />
        {barMaterial}
      </mesh>
      {/* Left / right bars fill the remaining height between them. */}
      <mesh position={[-(BILLBOARD_WIDTH / 2 + FRAME_THICKNESS / 2), 0, 0]}>
        <boxGeometry args={[FRAME_THICKNESS, BILLBOARD_HEIGHT, FRAME_DEPTH]} />
        {barMaterial}
      </mesh>
      <mesh position={[BILLBOARD_WIDTH / 2 + FRAME_THICKNESS / 2, 0, 0]}>
        <boxGeometry args={[FRAME_THICKNESS, BILLBOARD_HEIGHT, FRAME_DEPTH]} />
        {barMaterial}
      </mesh>
      {/* Backing slab, recessed behind the frame — gives the sign a real
          back instead of the poster floating in an open frame. */}
      <mesh position={[0, 0, -(FRAME_DEPTH / 2 + BACK_PANEL_DEPTH / 2)]}>
        <boxGeometry args={[outerW, outerH, BACK_PANEL_DEPTH]} />
        <meshStandardMaterial color="#0a0b0f" roughness={0.85} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Two cylindrical steel poles planted in the ground with a cross-brace and
// small foot plates — real load-bearing geometry standing the sign up,
// rather than a couple of drawn lines suggesting a support.
function BillboardSupport() {
  const poleHeight = BILLBOARD_CENTER_Y - BILLBOARD_HEIGHT / 2;
  const poleX = BILLBOARD_WIDTH * 0.32;
  const poleY = -BILLBOARD_HEIGHT / 2 - poleHeight / 2;
  const groundY = -BILLBOARD_CENTER_Y;

  const steel = (
    <meshStandardMaterial color="#14161c" roughness={0.35} metalness={0.75} />
  );

  return (
    <group>
      {[-poleX, poleX].map((x) => (
        <group key={x}>
          <mesh position={[x, poleY, 0]}>
            <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS, poleHeight, 16]} />
            {steel}
          </mesh>
          {/* Foot plate where the pole meets the ground. */}
          <mesh position={[x, groundY + 0.02, 0]}>
            <cylinderGeometry args={[POLE_RADIUS * 2.2, POLE_RADIUS * 2.4, 0.04, 20]} />
            {steel}
          </mesh>
        </group>
      ))}
      {/* Cross-brace tying the two poles together partway up. */}
      <mesh position={[0, groundY + poleHeight * 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[POLE_RADIUS * 0.6, POLE_RADIUS * 0.6, poleX * 2, 12]} />
        {steel}
      </mesh>
    </group>
  );
}

// A soft radial glow, painted once and reused as a sprite-like plane —
// the visual half of the backlight (the other half is a real point light
// so it also picks up as a colored highlight in the reflective ground).
function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rg = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  rg.addColorStop(0, `rgba(${BACKLIGHT_RGB},0.85)`);
  rg.addColorStop(0.45, `rgba(${BACKLIGHT_RGB},0.35)`);
  rg.addColorStop(1, `rgba(${BACKLIGHT_RGB},0)`);
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Sits directly behind the billboard panel — a glow plane larger than the
// billboard so it bleeds out past its edges, plus a real point light so the
// reflective ground beneath picks up a genuine colored highlight there too.
function BillboardBacklight() {
  const texture = useMemo(() => createGlowTexture(), []);
  return (
    <group position={[0, 0, -1.6]}>
      <mesh>
        <planeGeometry args={[BILLBOARD_WIDTH * 2.2, BILLBOARD_HEIGHT * 2.6]} />
        <meshBasicMaterial
          map={texture}
          color={texture ? "#ffffff" : BACKLIGHT_COLOR}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={BACKLIGHT_COLOR} intensity={9} distance={14} decay={2} />
    </group>
  );
}

// One large billboard that cycles through every photo like a slideshow,
// crossfading between the current and next image, instead of scattering a
// separate small billboard per photo across the scene.
function BillboardSlideshow({
  photos,
  onSelect,
}: {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
}) {
  const urls = useMemo(() => photos.map((p) => `${BASE_PATH}${p.previewSrc}`), [photos]);
  const textures = useTexture(urls);

  useEffect(() => {
    for (const t of textures) t.colorSpace = THREE.SRGBColorSpace;
  }, [textures]);

  const dims = useMemo(
    () =>
      photos.map((p) =>
        fitContain(p.width / p.height, BILLBOARD_WIDTH * 0.88, BILLBOARD_HEIGHT * 0.88)
      ),
    [photos]
  );

  const frontMeshRef = useRef<THREE.Mesh>(null);
  const backMeshRef = useRef<THREE.Mesh>(null);
  const frontMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const backMatRef = useRef<THREE.MeshBasicMaterial>(null);
  // Mutable, not React state — the crossfade runs every frame and only
  // needs to be visible to the imperative useFrame loop below; the one
  // moment other code (the click handler) cares about the current photo,
  // currentPhoto state (updated far less often, at each slide swap) covers it.
  const cycleRef = useRef({ index: 0, next: photos.length > 1 ? 1 : 0, elapsed: 0 });
  const [currentPhoto, setCurrentPhoto] = useState(photos[0]);

  // (Re)apply the first two slides whenever the photo list itself changes.
  useEffect(() => {
    cycleRef.current = { index: 0, next: photos.length > 1 ? 1 : 0, elapsed: 0 };
    setCurrentPhoto(photos[0]);
    if (frontMeshRef.current) frontMeshRef.current.scale.set(dims[0].w, dims[0].h, 1);
    if (backMeshRef.current) {
      const nextDims = dims[cycleRef.current.next];
      backMeshRef.current.scale.set(nextDims.w, nextDims.h, 1);
    }
    if (frontMatRef.current) {
      frontMatRef.current.map = textures[0] ?? null;
      frontMatRef.current.opacity = 1;
    }
    if (backMatRef.current) {
      backMatRef.current.map = textures[cycleRef.current.next] ?? null;
      backMatRef.current.opacity = 0;
    }
  }, [photos, textures, dims]);

  useFrame((_, delta) => {
    if (photos.length <= 1) return;
    const frontMat = frontMatRef.current;
    const backMat = backMatRef.current;
    const frontMesh = frontMeshRef.current;
    const backMesh = backMeshRef.current;
    if (!frontMat || !backMat || !frontMesh || !backMesh) return;

    const c = cycleRef.current;
    c.elapsed += delta;
    const holdEnd = SLIDE_SECONDS - CROSSFADE_SECONDS;

    if (c.elapsed <= holdEnd) {
      frontMat.opacity = 1;
      backMat.opacity = 0;
      return;
    }

    const t = Math.min(1, (c.elapsed - holdEnd) / CROSSFADE_SECONDS);
    frontMat.opacity = 1 - t;
    backMat.opacity = t;

    if (t >= 1) {
      c.index = c.next;
      c.next = (c.index + 1) % photos.length;
      c.elapsed = 0;
      frontMat.map = textures[c.index];
      frontMesh.scale.set(dims[c.index].w, dims[c.index].h, 1);
      frontMat.opacity = 1;
      backMat.map = textures[c.next];
      backMesh.scale.set(dims[c.next].w, dims[c.next].h, 1);
      backMat.opacity = 0;
      setCurrentPhoto(photos[c.index]);
    }
  });

  return (
    <group
      position={[0, BILLBOARD_CENTER_Y, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(currentPhoto);
      }}
    >
      <BillboardBacklight />
      <BillboardFrame />
      <BillboardSupport />
      {/* Two stacked photo planes, crossfading — the incoming slide fades
          in a hair in front of the outgoing one. Recessed a little behind
          the frame's front face, like a poster sitting inside a lightbox. */}
      {/* fog={false} on both: the scene's night-fog and backlight glow
          should dress up the sign and its surroundings, not tint the
          photos themselves — those need to read in their true colors. */}
      <mesh ref={backMeshRef} position={[0, 0, FRAME_DEPTH / 2 - 0.02]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={backMatRef}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh ref={frontMeshRef} position={[0, 0, FRAME_DEPTH / 2 - 0.018]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={frontMatRef}
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

export default function DigitalCityScene({
  photos,
  onSelect,
}: {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
}) {
  return (
    <Canvas dpr={[1, 2]}>
      <NightSky />
      <fog attach="fog" args={["#170c33", 12, 40]} />
      <ambientLight intensity={0.18} />
      <directionalLight position={[3, 6, 6]} intensity={0.5} color="#dfe8ff" />
      <directionalLight position={[-4, 3, -3]} intensity={0.12} color="#7dd3fc" />
      {/* Low and close to the ground, pitched up toward the billboard's
          center (CAMERA_PITCH) rather than looking at it straight on — a
          deliberate low-angle "hero shot" framing for a more cinematic feel. */}
      <PerspectiveCamera
        makeDefault
        position={[0, CAMERA_Y, CAMERA_Z]}
        rotation={[CAMERA_PITCH, 0, 0]}
        fov={54}
        near={0.1}
        far={60}
      />
      <ReflectiveGround />
      <GroundGrid />
      {photos.length > 0 && (
        <Suspense fallback={null}>
          <BillboardSlideshow photos={photos} onSelect={onSelect} />
        </Suspense>
      )}
    </Canvas>
  );
}
