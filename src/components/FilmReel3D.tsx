"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Photo } from "@/lib/photos";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const CAN_RADIUS = 0.55;
const CAN_HEIGHT = 1.05;
const FRAME_W = 1.5;
const FRAME_H = 1.0;
const FRAME_GAP = 0.18;
const FRAME_SPACING = FRAME_W + FRAME_GAP;
const PHOTO_MAX_W = 1.25;
const PHOTO_MAX_H = 0.82;
const SLOT_X = CAN_RADIUS + 0.05;
const HOLES_PER_FRAME = 3;
const CLICK_DRAG_THRESHOLD = 6;

function fitContain(aspect: number, maxW: number, maxH: number) {
  const boxAspect = maxW / maxH;
  return aspect > boxAspect
    ? { w: maxW, h: maxW / aspect }
    : { w: maxH * aspect, h: maxH };
}

function Canister() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[CAN_RADIUS, CAN_RADIUS, CAN_HEIGHT, 32]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, CAN_HEIGHT / 2 + 0.04, 0]}>
        <cylinderGeometry args={[CAN_RADIUS * 0.82, CAN_RADIUS * 0.82, 0.08, 32]} />
        <meshStandardMaterial color="#e8e3d5" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, CAN_HEIGHT / 2 + 0.14, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[CAN_RADIUS - 0.02, 0, 0]}>
        <boxGeometry args={[0.08, FRAME_H * 0.55, 0.06]} />
        <meshStandardMaterial color="#050505" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Frame({ photo, x, clipPlane }: { photo: Photo; x: number; clipPlane: THREE.Plane }) {
  const texture = useTexture(`${BASE_PATH}${photo.src}`);
  texture.colorSpace = THREE.SRGBColorSpace;

  const { w, h } = useMemo(
    () => fitContain(photo.width / photo.height, PHOTO_MAX_W, PHOTO_MAX_H),
    [photo.width, photo.height]
  );

  return (
    <mesh position={[x, 0, 0.03]} userData={{ photo }}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} clippingPlanes={[clipPlane]} />
    </mesh>
  );
}

function FilmStrip({
  photos,
  clipPlane,
  totalLength,
}: {
  photos: Photo[];
  clipPlane: THREE.Plane;
  totalLength: number;
}) {
  const ribbonLength = totalLength - SLOT_X;

  const holeXs = useMemo(() => {
    const xs: number[] = [];
    for (let i = 0; i < photos.length + 1; i++) {
      const base = SLOT_X + FRAME_GAP + i * FRAME_SPACING;
      for (let j = 0; j < HOLES_PER_FRAME; j++) {
        xs.push(base + ((j + 0.5) * FRAME_W) / HOLES_PER_FRAME);
      }
    }
    return xs;
  }, [photos.length]);

  return (
    <group>
      <mesh position={[SLOT_X + ribbonLength / 2, 0, 0]}>
        <boxGeometry args={[ribbonLength, FRAME_H, 0.04]} />
        <meshStandardMaterial
          color="#221d17"
          roughness={0.6}
          metalness={0.05}
          clippingPlanes={[clipPlane]}
        />
      </mesh>

      {holeXs.map((x) => (
        <group key={x}>
          <mesh position={[x, FRAME_H / 2 - 0.08, 0.025]}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
            <meshStandardMaterial color="#050505" clippingPlanes={[clipPlane]} />
          </mesh>
          <mesh position={[x, -(FRAME_H / 2 - 0.08), 0.025]}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
            <meshStandardMaterial color="#050505" clippingPlanes={[clipPlane]} />
          </mesh>
        </group>
      ))}

      {photos.map((photo, i) => (
        <Frame
          key={photo.id}
          photo={photo}
          x={SLOT_X + FRAME_GAP + i * FRAME_SPACING + FRAME_W / 2}
          clipPlane={clipPlane}
        />
      ))}
    </group>
  );
}

function DragRig({
  clipPlane,
  minPulled,
  maxPulled,
  onPhotoClick,
}: {
  clipPlane: THREE.Plane;
  minPulled: number;
  maxPulled: number;
  onPhotoClick?: (photo: Photo) => void;
}) {
  const { camera, gl, scene } = useThree();
  const pulledRef = useRef(minPulled);
  const draggingRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const startXRef = useRef(0);
  const startClientRef = useRef({ x: 0, y: 0 });
  const startPulledRef = useRef(minPulled);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    const dom = gl.domElement;
    dom.style.touchAction = "none";
    dom.style.cursor = "grab";
    const scale = 0.006;

    function onPointerDown(e: PointerEvent) {
      draggingRef.current = true;
      hasInteractedRef.current = true;
      startXRef.current = e.clientX;
      startClientRef.current = { x: e.clientX, y: e.clientY };
      startPulledRef.current = pulledRef.current;
      dom.style.cursor = "grabbing";
      dom.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      pulledRef.current = THREE.MathUtils.clamp(
        startPulledRef.current + dx * scale,
        minPulled,
        maxPulled
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
      if (moved > CLICK_DRAG_THRESHOLD || !onPhotoClick) return;

      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const data = hit.object.userData as { photo?: Photo };
        if (data.photo && hit.point.x <= clipPlane.constant + 0.02) {
          onPhotoClick(data.photo);
          break;
        }
      }
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
  }, [gl, scene, camera, raycaster, minPulled, maxPulled, clipPlane, onPhotoClick]);

  useFrame(({ clock }) => {
    let display = pulledRef.current;
    if (!hasInteractedRef.current) {
      display += Math.max(0, Math.sin(clock.elapsedTime * 1.2)) * 0.25;
    }
    clipPlane.constant = display;

    const targetX = display / 2;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08);
    camera.position.y = 0.75;
    camera.lookAt(targetX, 0.05, 0);
  });

  return null;
}

export default function FilmReel3D({
  photos,
  onPhotoClick,
}: {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}) {
  const totalLength = SLOT_X + FRAME_GAP + photos.length * FRAME_SPACING + FRAME_GAP;
  const minPulled = SLOT_X + FRAME_GAP + FRAME_SPACING * 0.35;
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), minPulled), [minPulled]);
  const camZ = 3.1 + Math.min(totalLength, 6) * 0.11;

  return (
    <Canvas
      camera={{ position: [minPulled / 2, 0.75, camZ], fov: 45 }}
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
      <Canister />
      <Suspense fallback={null}>
        <FilmStrip photos={photos} clipPlane={clipPlane} totalLength={totalLength} />
      </Suspense>
      <DragRig
        clipPlane={clipPlane}
        minPulled={minPulled}
        maxPulled={totalLength}
        onPhotoClick={onPhotoClick}
      />
    </Canvas>
  );
}
