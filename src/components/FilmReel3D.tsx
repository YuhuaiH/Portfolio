"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Photo } from "@/lib/photos";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const FRAME_W = 1.7;
const FRAME_H = 1.15;
const PHOTO_MAX_W = 1.4;
const PHOTO_MAX_H = 0.9;
const HOLES_PER_EDGE = 5;

function fitContain(aspect: number, maxW: number, maxH: number) {
  const boxAspect = maxW / maxH;
  return aspect > boxAspect
    ? { w: maxW, h: maxW / aspect }
    : { w: maxH * aspect, h: maxH };
}

function Frame({ photo, angle, radius }: { photo: Photo; angle: number; radius: number }) {
  const texture = useTexture(`${BASE_PATH}${photo.src}`);
  texture.colorSpace = THREE.SRGBColorSpace;

  const { w, h } = useMemo(
    () => fitContain(photo.width / photo.height, PHOTO_MAX_W, PHOTO_MAX_H),
    [photo.width, photo.height]
  );

  const holeXs = useMemo(
    () =>
      Array.from(
        { length: HOLES_PER_EDGE },
        (_, i) => -FRAME_W / 2 + ((i + 0.5) * FRAME_W) / HOLES_PER_EDGE
      ),
    []
  );

  return (
    <group position={[radius * Math.sin(angle), 0, radius * Math.cos(angle)]} rotation={[0, angle, 0]}>
      <mesh>
        <planeGeometry args={[FRAME_W, FRAME_H]} />
        <meshStandardMaterial color="#161310" roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {holeXs.map((x) => (
        <group key={x}>
          <mesh position={[x, FRAME_H / 2 - 0.09, 0.015]}>
            <boxGeometry args={[0.09, 0.06, 0.02]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          <mesh position={[x, -(FRAME_H / 2 - 0.09), 0.015]}>
            <boxGeometry args={[0.09, 0.06, 0.02]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Reel({ photos, radius }: { photos: Photo[]; radius: number }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.42, 0.42, 0.3, 32]} />
        <meshStandardMaterial color="#8c8c8c" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 32]} />
        <meshStandardMaterial color="#6f6f6f" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.17, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 32]} />
        <meshStandardMaterial color="#6f6f6f" metalness={0.7} roughness={0.35} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, FRAME_H / 2 - 0.02, 0]}>
        <torusGeometry args={[radius, 0.02, 8, 64]} />
        <meshStandardMaterial color="#161310" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -(FRAME_H / 2 - 0.02), 0]}>
        <torusGeometry args={[radius, 0.02, 8, 64]} />
        <meshStandardMaterial color="#161310" />
      </mesh>

      {photos.map((photo, i) => (
        <Frame key={photo.id} photo={photo} angle={(i / photos.length) * Math.PI * 2} radius={radius} />
      ))}
    </group>
  );
}

export default function FilmReel3D({ photos }: { photos: Photo[] }) {
  const radius = useMemo(
    () => Math.max(2.2, (FRAME_W * 1.15 * photos.length) / (Math.PI * 2)),
    [photos.length]
  );

  return (
    <Canvas
      camera={{ position: [0, 0.5, radius + 3.2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 6]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.3} />
      <Suspense fallback={null}>
        <Reel photos={photos} radius={radius} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minPolarAngle={Math.PI / 2 - 0.25}
        maxPolarAngle={Math.PI / 2 + 0.25}
      />
    </Canvas>
  );
}
