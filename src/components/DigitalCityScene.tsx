"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { MeshReflectorMaterial, OrthographicCamera, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Photo } from "@/lib/photos";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// A handful of saturated synthwave accents, cycled per billboard.
const NEON_COLORS = ["#00f0ff", "#ff2bd6", "#7b2ff7", "#00ff9d", "#ffb800", "#ff3860"];

const SPACING = 2.6;
const MIN_WIDTH = 1.3;
const MAX_WIDTH = 2.5;
const MIN_HEIGHT = 1.9;
const MAX_HEIGHT = 3.6;

// A cheap deterministic pseudo-random in [0,1) — stable across re-renders
// (each billboard keeps its layout instead of reshuffling), but different
// per seed so nearby properties don't end up correlated.
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function fitContain(aspect: number, maxW: number, maxH: number) {
  const boxAspect = maxW / maxH;
  return aspect > boxAspect ? { w: maxW, h: maxW / aspect } : { w: maxH * aspect, h: maxH };
}

function useRectOutline(width: number, height: number) {
  return useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ]);
  }, [width, height]);
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
        color="#050308"
        metalness={0.3}
        mirror={0}
      />
    </mesh>
  );
}

function Billboard({
  photo,
  x,
  y,
  z,
  rotationZ,
  width,
  height,
  color,
  onSelect,
}: {
  photo: Photo;
  x: number;
  y: number;
  z: number;
  rotationZ: number;
  width: number;
  height: number;
  color: string;
  onSelect: (photo: Photo) => void;
}) {
  const texture = useTexture(`${BASE_PATH}${photo.src}`);
  texture.colorSpace = THREE.SRGBColorSpace;

  const outline = useRectOutline(width, height);
  const glowOutline = useRectOutline(width * 1.08, height * 1.08);

  const { w, h } = useMemo(
    () => fitContain(photo.width / photo.height, width * 0.88, height * 0.88),
    [photo.width, photo.height, width, height]
  );

  return (
    <group position={[x, y, z]} rotation={[0, 0, rotationZ]} userData={{ photo }}>
      {/* Faint outer halo — a cheap stand-in for real bloom. */}
      <lineLoop geometry={glowOutline}>
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </lineLoop>
      <lineLoop geometry={outline}>
        <lineBasicMaterial color={color} />
      </lineLoop>
      {/* The photo fills the panel like an ad on a billboard — a flat
          plane, not a face on a box. */}
      <mesh
        position={[0, 0, 0.01]}
        userData={{ photo }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(photo);
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Loosely scattered, not a tidy row or grid — each billboard gets its own
// size, height off the ground, depth, and a slight jaunty tilt, the way a
// wall of signs and posters actually looks rather than a lined-up display.
function BillboardField({
  photos,
  onSelect,
}: {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
}) {
  const billboards = useMemo(() => {
    return photos.map((photo, i) => {
      const s = i * 7.13 + 1;
      const width = MIN_WIDTH + seededRandom(s) * (MAX_WIDTH - MIN_WIDTH);
      const height = MIN_HEIGHT + seededRandom(s + 2.7) * (MAX_HEIGHT - MIN_HEIGHT);
      const baseX = (i - (photos.length - 1) / 2) * SPACING;
      const x = baseX + (seededRandom(s + 4.1) - 0.5) * SPACING * 0.7;
      const y = height / 2 + seededRandom(s + 6.6) * 1.6;
      const z = (seededRandom(s + 8.2) - 0.5) * 2.4;
      const rotationZ = (seededRandom(s + 10.4) - 0.5) * 0.3;
      return {
        photo,
        x,
        y,
        z,
        rotationZ,
        width,
        height,
        color: NEON_COLORS[i % NEON_COLORS.length],
      };
    });
  }, [photos]);

  return (
    <>
      {billboards.map((b) => (
        <Suspense key={b.photo.id} fallback={null}>
          <Billboard
            photo={b.photo}
            x={b.x}
            y={b.y}
            z={b.z}
            rotationZ={b.rotationZ}
            width={b.width}
            height={b.height}
            color={b.color}
            onSelect={onSelect}
          />
        </Suspense>
      ))}
    </>
  );
}

export default function DigitalCityScene({
  photos,
  onSelect,
}: {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
}) {
  const fieldWidth = Math.max(photos.length - 1, 0) * SPACING + MAX_WIDTH;
  // Orthographic, not perspective — a fixed, flat "poster" view instead of
  // a 3D space with a vanishing point. zoom is tuned against fieldWidth so
  // it frames however many billboards there are without the viewer ever
  // needing to move the camera.
  const zoom = Math.min(90, (720 * 6) / (fieldWidth + 4));

  return (
    <Canvas dpr={[1, 2]}>
      <NightSky />
      <fog attach="fog" args={["#170c33", 8, 26]} />
      <ambientLight intensity={0.25} />
      <OrthographicCamera
        makeDefault
        position={[0, 2.4, 12]}
        rotation={[-0.06, 0, 0]}
        zoom={zoom}
        near={0.1}
        far={60}
      />
      <ReflectiveGround />
      <BillboardField photos={photos} onSelect={onSelect} />
    </Canvas>
  );
}
