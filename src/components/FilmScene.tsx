"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { FilmRoll, Photo } from "@/lib/photos";

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
const ROLL_MARGIN = 2.2;
const CLICK_DRAG_THRESHOLD = 6;
const DRAG_SCALE = 0.006;

type RollState = {
  roll: FilmRoll;
  index: number;
  baseX: number;
  totalLength: number;
  minPulled: number;
  clipPlane: THREE.Plane;
  pulledRef: { current: number };
  hasInteractedRef: { current: boolean };
};

function buildRollStates(filmRolls: FilmRoll[]): RollState[] {
  let cursor = 0;
  return filmRolls.map((roll, index) => {
    const totalLength = SLOT_X + FRAME_GAP + roll.photos.length * FRAME_SPACING + FRAME_GAP;
    const minPulled = SLOT_X + FRAME_GAP + FRAME_SPACING * 0.35;
    const baseX = cursor;
    cursor += totalLength + ROLL_MARGIN;

    return {
      roll,
      index,
      baseX,
      totalLength,
      minPulled,
      clipPlane: new THREE.Plane(new THREE.Vector3(-1, 0, 0), baseX + minPulled),
      pulledRef: { current: minPulled },
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

function Canister({ rollIndex }: { rollIndex: number }) {
  const userData = { rollIndex };
  return (
    <group>
      <mesh userData={userData}>
        <cylinderGeometry args={[CAN_RADIUS, CAN_RADIUS, CAN_HEIGHT, 32]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, CAN_HEIGHT / 2 + 0.04, 0]} userData={userData}>
        <cylinderGeometry args={[CAN_RADIUS * 0.82, CAN_RADIUS * 0.82, 0.08, 32]} />
        <meshStandardMaterial color="#e8e3d5" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, CAN_HEIGHT / 2 + 0.14, 0]} userData={userData}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[CAN_RADIUS - 0.02, 0, 0]} userData={userData}>
        <boxGeometry args={[0.08, FRAME_H * 0.55, 0.06]} />
        <meshStandardMaterial color="#050505" roughness={0.8} />
      </mesh>
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

  const { w, h } = useMemo(
    () => fitContain(photo.width / photo.height, PHOTO_MAX_W, PHOTO_MAX_H),
    [photo.width, photo.height]
  );

  return (
    <mesh position={[x, 0, 0.03]} userData={{ photo, rollIndex }}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} clippingPlanes={[clipPlane]} />
    </mesh>
  );
}

function FilmStrip({ rs }: { rs: RollState }) {
  const { roll, clipPlane, totalLength, index } = rs;
  const ribbonLength = totalLength - SLOT_X;

  const holeXs = useMemo(() => {
    const xs: number[] = [];
    for (let i = 0; i < roll.photos.length + 1; i++) {
      const base = SLOT_X + FRAME_GAP + i * FRAME_SPACING;
      for (let j = 0; j < HOLES_PER_FRAME; j++) {
        xs.push(base + ((j + 0.5) * FRAME_W) / HOLES_PER_FRAME);
      }
    }
    return xs;
  }, [roll.photos.length]);

  return (
    <group>
      <mesh position={[SLOT_X + ribbonLength / 2, 0, 0]} userData={{ rollIndex: index }}>
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
          <mesh position={[x, FRAME_H / 2 - 0.08, 0.025]} userData={{ rollIndex: index }}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
            <meshStandardMaterial color="#050505" clippingPlanes={[clipPlane]} />
          </mesh>
          <mesh position={[x, -(FRAME_H / 2 - 0.08), 0.025]} userData={{ rollIndex: index }}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
            <meshStandardMaterial color="#050505" clippingPlanes={[clipPlane]} />
          </mesh>
        </group>
      ))}

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

function RollGroup({ rs }: { rs: RollState }) {
  return (
    <group position={[rs.baseX, 0, 0]}>
      <Canister rollIndex={rs.index} />
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
  const { camera, gl, scene } = useThree();
  const draggingRef = useRef(false);
  const startClientRef = useRef({ x: 0, y: 0 });
  const startPulledRef = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const focusedIndexRef = useRef(focusedIndex);

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

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
      const hits = raycaster.intersectObjects(scene.children, true);
      const idx = focusedIndexRef.current;

      for (const hit of hits) {
        const data = hit.object.userData as { photo?: Photo; rollIndex?: number };
        if (data.rollIndex === undefined) continue;

        if (data.photo && idx === data.rollIndex) {
          const rs = rollStates[data.rollIndex];
          if (hit.point.x <= rs.clipPlane.constant + 0.02) {
            onPhotoClick(data.photo);
            return;
          }
          continue;
        }

        if (data.rollIndex !== idx) {
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
    for (const rs of rollStates) {
      let local = rs.pulledRef.current;
      if (!rs.hasInteractedRef.current) {
        local += Math.max(0, Math.sin(clock.elapsedTime * 1.2 + rs.index * 0.7)) * 0.25;
      }
      rs.clipPlane.constant = rs.baseX + local;
    }

    const idx = focusedIndexRef.current;
    if (idx === null) {
      const last = rollStates[rollStates.length - 1];
      const overviewWidth = last.baseX + last.minPulled;
      const targetX = overviewWidth / 2;
      const camZ = 4.5 + overviewWidth * 0.32;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.06);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.5, 0.06);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, 0.06);
      camera.lookAt(targetX, 0.2, 0);
    } else {
      const rs = rollStates[idx];
      const display = rs.clipPlane.constant - rs.baseX;
      const targetX = rs.baseX + display / 2;
      const camZ = 3.1 + Math.min(rs.totalLength, 6) * 0.11;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.75, 0.08);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, 0.08);
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
        <RollGroup key={rs.roll.name} rs={rs} />
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
