"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { PerspectiveCamera, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { THEME } from "@/lib/theme";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — same fix as
// SiteHeader.tsx / FilmScene.tsx / DigitalCityScene.tsx, needed here too
// since these assets are fetched directly rather than through next/image.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const MODEL_PATH = `${BASE_PATH}/models/eye/eye.fbx`;

// The asset set's own filenames don't reliably describe their contents —
// one file in this folder was even a binary FBX model saved with a .png
// extension (now renamed to eye.fbx). These four were matched to the
// "Sclera" and "Iris" meshes below by what's actually painted on them and
// by which UV-island layout they fit, not by name.
const TEXTURES = {
  scleraDiffuse: `${BASE_PATH}/models/eye/materiliz_diffuseOriginal.png`,
  scleraBump: `${BASE_PATH}/models/eye/T_Sclera_B.png`,
  irisDiffuse: `${BASE_PATH}/models/eye/T_Sclera_D.png`,
  irisBump: `${BASE_PATH}/models/eye/Eye_Ble_Bump.png`,
};

// Each mesh node in the FBX carries a ~120x scale baked in by the
// exporting tool's unit conversion — left alone, the sphere renders about
// 114 world units across. This brings the whole rig back down to roughly
// unit scale so a normal camera distance frames it.
const EYE_SCALE = 0.0075;
const CAMERA_Z = 3;
const CAMERA_FOV = 34;

// How far (in degrees) the eye can rotate off dead-center before it's
// clamped — real eyes swing a bit further side to side than up and down.
// Kept fairly tight: the iris cap sits proud of the sclera's own surface
// (see the mesh.position.z note below), so at wide angles it would swing
// past the sclera's silhouette instead of staying inside it.
const MAX_YAW_DEG = 13;
const MAX_PITCH_DEG = 9;
// Screen-pixel distance at which the eye is fully "looking" toward the
// cursor — closer than this and the deflection scales down proportionally.
// Cursor position is tracked on the whole window (not just the canvas), so
// the eye keeps looking toward the cursor even once it's left the canvas.
const SENSITIVITY_PX = 380;
const TRACK_LERP = 0.12;
// A deliberate "look there now" snap for the click reaction below — much
// snappier than the ambient cursor-follow, so it reads as the eye reacting
// to the click rather than just continuing to drift toward it.
const REACTION_LERP = 0.35;
// How far the pupil grows at its most dilated, and how quickly it eases
// there and back — a startle response to being clicked, not a slow fade.
const PUPIL_DILATE_SCALE = 1.55;
const PUPIL_LERP = 0.18;

// A one-shot "autofocus rack" the pupil plays when the cursor lands on an
// interactable element (see `focusPulse` below): a quick constrict, an
// overshoot past resting size, then a settle back to normal — the same
// three-beat motion a camera lens makes hunting for focus on a new
// subject, rather than a plain dilate/contract. Durations are in seconds
// (matches R3F's clock.elapsedTime); scales are relative to the pupil's
// resting size (1).
const PULSE_CONSTRICT_S = 0.09;
const PULSE_OVERSHOOT_S = 0.13;
const PULSE_SETTLE_S = 0.16;
const PULSE_TOTAL_S = PULSE_CONSTRICT_S + PULSE_OVERSHOOT_S + PULSE_SETTLE_S;
const PULSE_CONSTRICT_SCALE = 0.82;
const PULSE_OVERSHOOT_SCALE = 1.14;

// `elapsed` is seconds since the pulse started; returns 1 (no-op) once the
// whole three-beat motion has finished playing.
function focusPulseScale(elapsed: number): number {
  if (elapsed < PULSE_CONSTRICT_S) {
    return THREE.MathUtils.lerp(
      1,
      PULSE_CONSTRICT_SCALE,
      THREE.MathUtils.smoothstep(elapsed, 0, PULSE_CONSTRICT_S)
    );
  }
  if (elapsed < PULSE_CONSTRICT_S + PULSE_OVERSHOOT_S) {
    return THREE.MathUtils.lerp(
      PULSE_CONSTRICT_SCALE,
      PULSE_OVERSHOOT_SCALE,
      THREE.MathUtils.smoothstep(elapsed, PULSE_CONSTRICT_S, PULSE_CONSTRICT_S + PULSE_OVERSHOOT_S)
    );
  }
  if (elapsed < PULSE_TOTAL_S) {
    return THREE.MathUtils.lerp(
      PULSE_OVERSHOOT_SCALE,
      1,
      THREE.MathUtils.smoothstep(elapsed, PULSE_CONSTRICT_S + PULSE_OVERSHOOT_S, PULSE_TOTAL_S)
    );
  }
  return 1;
}

// Set while a nav card is being clicked: the direction (in the same
// [-1, 1] per-axis range as the yaw/pitch clamps below) the eye should
// snap to look toward — e.g. the corner the clicked card sits in — plus
// whether the pupil should dilate. Passed down from EyeHero, which knows
// about the click; EyeStage itself has no notion of navigation.
export type EyeReaction = { dir: readonly [number, number]; dilate: boolean } | null;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Remaps a grayscale image so its dark values land on `darkColor` and its
// light values land on `lightColor`, instead of just tinting the whole
// thing one flat shade — the only way to turn a grayscale "dark vein lines
// on a light field" texture (this asset's actual sclera map) into
// something that reads as red veins on white, rather than the whole
// sclera coming out a single uniform pink. `contrastGamma` > 1 pushes
// midtones darker before the lerp — the source veins are only a little
// darker than the field around them, so a straight lerp barely tints
// them; a gamma curve makes them pop the way real bloodshot veins do,
// without crushing the light background (still 1 → 1 at the white end).
function recolorGrayscale(
  image: TexImageSource | undefined,
  darkHex: string,
  lightHex: string,
  contrastGamma = 1
): THREE.CanvasTexture | null {
  if (!image || !("width" in image) || !image.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image as CanvasImageSource, 0, 0);

  const [dr, dg, db] = hexToRgb(darkHex);
  const [lr, lg, lb] = hexToRgb(lightHex);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.pow(data[i] / 255, contrastGamma);
    data[i] = lr * l + dr * (1 - l);
    data[i + 1] = lg * l + dg * (1 - l);
    data[i + 2] = lb * l + db * (1 - l);
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A soft, bright dot on a transparent field — a fixed "wet eye" specular
// glint decal, rather than relying on the scene lights to happen to catch
// the cornea at the right angle to produce one on their own.
function createGlintTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function Eyeball({ pupilRef }: { pupilRef: React.RefObject<THREE.Mesh | null> }) {
  const fbx = useLoader(FBXLoader, MODEL_PATH);
  const glintTexture = useMemo(() => createGlintTexture(), []);
  const [scleraDiffuse, scleraBump, irisDiffuse, irisBump] = useTexture([
    TEXTURES.scleraDiffuse,
    TEXTURES.scleraBump,
    TEXTURES.irisDiffuse,
    TEXTURES.irisBump,
  ]);

  // Cloned so repeated mounts (e.g. React fast refresh) never mutate the
  // object useLoader caches for MODEL_PATH.
  const rig = useMemo(() => {
    const root = fbx.clone(true);
    // Both source diffuse maps are plain grayscale (no color data at all —
    // this asset's real color must have come from material tinting, not
    // the textures themselves). A flat multiply tint is enough for the
    // iris (light fibers over dark pupil reads fine recolored blue
    // uniformly), but the sclera's veins need to read as red ON a white
    // field, not the whole thing tinted one flat shade — so that one gets
    // remapped per-pixel instead: dark (vein) pixels toward red, light
    // (sclera) pixels toward white.
    const scleraColorMap = recolorGrayscale(
      scleraDiffuse.image as TexImageSource | undefined,
      "#6a1410",
      // Ivory/bone rather than a clean pinkish white — a pure white sclera
      // was the brightest, least-natural thing in a scene that's otherwise
      // near-black and candle-lit, and it made the eye read as pasted on.
      "#ddd2bf",
      1.7
    );
    // The iris texture fades to pure black at its rim and corners (the
    // outer ~8% of its radius and beyond is 98-100% black). Multiplied by a
    // tint, black stays black — which is what wrapped the iris in a thick,
    // dead-black ring. Remapped like the sclera instead: its darks become a
    // deep warm brown (a real limbal ring, which still catches light), its
    // lights the accent tint the multiply used to give.
    const irisColorMap = recolorGrayscale(
      irisDiffuse.image as TexImageSource | undefined,
      "#2a1f13",
      THEME.accentBright
    );

    const lights: THREE.Object3D[] = [];
    root.traverse((child) => {
      if ((child as THREE.Light).isLight) {
        lights.push(child);
        return;
      }
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      if (mesh.name === "Sclera") {
        mesh.material = new THREE.MeshStandardMaterial({
          map: scleraColorMap ?? scleraDiffuse,
          bumpMap: scleraBump,
          bumpScale: 0.02,
          roughness: 0.5,
        });
      } else if (mesh.name === "Iris") {
        mesh.material = new THREE.MeshStandardMaterial({
          map: irisColorMap ?? irisDiffuse,
          bumpMap: irisBump,
          bumpScale: 0.01,
          // The tint is baked into irisColorMap; only the raw-texture
          // fallback still needs it multiplied in here.
          color: irisColorMap ? "#ffffff" : THEME.accentBright,
          roughness: 0.35,
        });
        // mesh.position is in the FBX's own raw coordinate space (this
        // node's baked scale is ~124x, and EYE_SCALE shrinks the whole rig
        // by another 0.0075x on top of that) — a shift here needs to be
        // this much larger than the world-unit gap it's meant to open up,
        // or it rounds away to nothing once both those scales are applied.
        // Kept as small as still clears the sclera: too large and the
        // (flat) iris cap pokes visibly proud of the (curved) sclera's
        // silhouette, badly enough to swing clear of it — and of the
        // canvas's own edge — once the rig rotates toward the cursor.
        mesh.position.z -= 29;
        // Shrunk a little in X/Y too: a smaller cap's edge sits closer to
        // the rotation axis, so it sweeps a shorter arc — and stays inside
        // the sclera's own silhouette — at the same rotation angle.
        mesh.scale.x *= 0.82;
        mesh.scale.y *= 0.82;
      }
    });
    // The FBX carries its own baked directional lights (an artifact of
    // however it was exported) — dropped in favor of this component's own
    // lighting rig, set up below.
    for (const light of lights) light.parent?.remove(light);

    return root;
  }, [fbx, scleraDiffuse, scleraBump, irisDiffuse, irisBump]);

  return (
    <>
      <group scale={EYE_SCALE}>
        <primitive object={rig} />
      </group>
      {/* The pupil is a real hole in the iris mesh, not just a dark patch
          in its texture (this asset's own Cornea mesh, which would
          normally sit over that hole, didn't survive — see the eye.fbx
          rename note above). Patched with a plain disc in world units,
          placed just in front of the sclera's own front pole (measured at
          world z ≈ -0.98) — simpler than positioning it relative to the
          iris's nested FBX-node scale. Sized with real margin past the
          texture's actual pupil edge: this flat patch sits at a fixed
          depth while the true hole is on the iris's curved/recessed
          surface, so at dead center they line up, but rotating the rig
          swings the two around the eye's pivot by different effective
          radii — a too-tight radius here left a sliver of the real hole
          uncovered (showing as a bright crescent) once rotated off-center. */}
      <mesh ref={pupilRef} position={[0, 0, -1.01]}>
        <circleGeometry args={[0.165, 48]} />
        {/* Very dark warm brown, not pure black, and glossy: a real pupil
            is wet, so it should pick up the candle light's sheen rather
            than read as a hole punched through the eye. */}
        <meshStandardMaterial color="#140d0a" roughness={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* Fixed specular glint, offset up-left on the pupil like a real
          "catch light" — additive blending so it brightens rather than
          replacing whatever's beneath it, and unlit (MeshBasicMaterial)
          so it stays a bright, reliable sparkle regardless of how the
          scene lights happen to be angled after the rig rotates. */}
      {glintTexture && (
        <mesh position={[-0.045, 0.045, -1.02]}>
          <circleGeometry args={[0.045, 32]} />
          <meshBasicMaterial
            map={glintTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
}

// Rotates the whole eyeball (sclera + iris together, as a real eye rotates
// in its socket) to track the cursor anywhere on the page — or, while
// `reaction` is set, snaps to look in a given direction and dilates the
// pupil instead, as a startle response to a nav card being clicked.
// `focusPulse`, bumped by a parent each time the cursor lands on something
// interactable, plays the autofocus-rack pupil pulse defined above.
function EyeRig({
  reaction,
  focusPulse,
  onReady,
}: {
  reaction: EyeReaction;
  focusPulse?: number;
  onReady?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pupilRef = useRef<THREE.Mesh>(null);
  const pupilScaleRef = useRef(1);
  const { gl } = useThree();
  const offsetRef = useRef({ dx: 0, dy: 0 });
  const targetQuatRef = useRef(new THREE.Quaternion());
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  // Tracks which `focusPulse` value has already started its animation, and
  // when (in clock.elapsedTime seconds) — so a change in the prop starts a
  // fresh pulse exactly once, rather than replaying every frame the prop
  // happens to still differ from some other stored value.
  const pulseSeenRef = useRef(focusPulse ?? 0);
  const pulseStartRef = useRef<number | null>(null);

  // EyeRig sits inside the Suspense boundary below (its child, Eyeball,
  // is what actually suspends on the model/texture loads) — so this
  // effect firing IS the "the eye actually has something to show now"
  // signal, distinct from EyeStage's own mount, which happens well
  // before the FBX/textures resolve. Lets a parent (EyeHero) sync its
  // entrance transition to when the eye is genuinely ready instead of
  // guessing at a fixed delay.
  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      offsetRef.current = {
        dx: e.clientX - (rect.left + rect.width / 2),
        dy: e.clientY - (rect.top + rect.height / 2),
      };
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    if ((focusPulse ?? 0) !== pulseSeenRef.current) {
      pulseSeenRef.current = focusPulse ?? 0;
      pulseStartRef.current = state.clock.elapsedTime;
    }
    let pulseScale = 1;
    if (pulseStartRef.current !== null) {
      const elapsed = state.clock.elapsedTime - pulseStartRef.current;
      if (elapsed < PULSE_TOTAL_S) {
        pulseScale = focusPulseScale(elapsed);
      } else {
        pulseStartRef.current = null;
      }
    }

    let yaw: number;
    let pitch: number;
    if (reaction) {
      yaw = reaction.dir[0] * THREE.MathUtils.degToRad(MAX_YAW_DEG);
      pitch = reaction.dir[1] * THREE.MathUtils.degToRad(MAX_PITCH_DEG);
    } else {
      const { dx, dy } = offsetRef.current;
      yaw =
        THREE.MathUtils.clamp(dx / SENSITIVITY_PX, -1, 1) * THREE.MathUtils.degToRad(MAX_YAW_DEG);
      // Negated: the rig's natural rest orientation faces -Z (toward the
      // camera on this side), so a positive X-rotation tilts that forward
      // vector up rather than down — the opposite of the more common +Z
      // convention pitch would otherwise assume.
      pitch =
        THREE.MathUtils.clamp(-dy / SENSITIVITY_PX, -1, 1) *
        THREE.MathUtils.degToRad(MAX_PITCH_DEG);
    }

    eulerRef.current.set(pitch, yaw, 0);
    targetQuatRef.current.setFromEuler(eulerRef.current);
    group.quaternion.slerp(targetQuatRef.current, reaction ? REACTION_LERP : TRACK_LERP);

    // The click-reaction dilate wins outright over a still-playing focus
    // pulse (rather than blending): `pulseScale` dips below 1 during its
    // constrict beat, so max()-ing it against the dilate target would
    // silently clip that dip to 1 whenever a dilate was also active, and
    // multiplying the two would risk an oversized pupil on overlap. A
    // click is a rarer, more deliberate event than a hover — simplest for
    // it to just take over rather than mix.
    const targetPupilScale = reaction?.dilate ? PUPIL_DILATE_SCALE : pulseScale;
    pupilScaleRef.current = THREE.MathUtils.lerp(
      pupilScaleRef.current,
      targetPupilScale,
      PUPIL_LERP
    );
    pupilRef.current?.scale.setScalar(pupilScaleRef.current);
  });

  return (
    <group ref={groupRef}>
      <Eyeball pupilRef={pupilRef} />
    </group>
  );
}

// The light in front of the eye — "tender and creepy". Tender: a warm,
// rose-tinted candle glow with a wide, soft falloff, not a hard spot.
// Creepy: it sits low and in front, shining up at the eye (the flashlight-
// under-the-chin angle), and it never holds still — a slow breath every
// ~6s with a faint, irregular candle waver on top, so the eye reads as lit
// by something you can't see rather than by a studio light.
//
// The camera is on -Z looking toward +Z (see EyeStage), so "in front" is
// negative z. Physically based units: at ~2.3 from the eye, intensity ~4.5
// lands near the strength of the existing key light.
const CANDLE_BASE = 4.5;

function CandleLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  const still = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame(({ clock }) => {
    const light = lightRef.current;
    if (!light || still) return;
    const t = clock.elapsedTime;
    const breath = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 6.2); // 0..1, slow
    // Three incommensurate sines: an uneven waver that never visibly loops.
    const waver = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.9 + 1.3) * 0.3 + Math.sin(t * 3.1 + 0.7) * 0.2;
    light.intensity = CANDLE_BASE * (0.78 + 0.32 * breath + 0.05 * waver);
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0.25, -1.1, -2.1]}
      color="#ffb59e"
      intensity={CANDLE_BASE}
      distance={7}
      decay={2}
    />
  );
}

// A single large eyeball, built from the real-world eye asset in
// public/models/eye, that rotates to stare at the cursor anywhere on the
// page. `reaction`, set by a parent that knows about clicks elsewhere on
// the page (e.g. EyeHero's nav cards), overrides that cursor-follow with a
// snap-and-dilate response instead. `focusPulse`, bumped by a parent each
// time the cursor lands on an interactable element, plays a quick
// autofocus-style pupil pulse. `onReady` fires once the model and textures
// have actually loaded and the eye has something to show.
export default function EyeStage({
  reaction = null,
  focusPulse,
  onReady,
}: {
  reaction?: EyeReaction;
  focusPulse?: number;
  onReady?: () => void;
}) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      {/* The model's iris aperture opens toward -Z in its own raw
          coordinates (the sclera shell's opposite pole bulges out further,
          so rotating the mesh around to face a default +Z camera lets that
          far pole occlude the iris). Simpler to view it from its own
          natural side instead: camera sits on -Z, rotated 180° to still
          look back in toward the origin. */}
      <PerspectiveCamera
        makeDefault
        position={[0, 0, -CAMERA_Z]}
        rotation={[0, Math.PI, 0]}
        fov={CAMERA_FOV}
      />
      {/* Lit to match SpaceBackground.tsx rather than as a studio product
          shot, so the eye sits *in* that scene instead of on top of it:
          - low ambient, so the shadow side actually falls off into the dark
            the way the rocks around it do (0.55 used to flatten it out);
          - a warm rim from behind and below — the same canyon light the
            background's rocks are lit by, wrapping the eye's silhouette
            in the same gold;
          - a soft, slightly warm key from the upper left for form;
          - the same dim cool fill the background uses for its shadows;
          - a small point light kept only for the wet catchlight;
          - CandleLight: the breathing rose glow from low in front (see
            above), plus a little more ambient and key than before, which
            left the eye's face too dark. */}
      <ambientLight intensity={0.22} />
      <directionalLight position={[0.4, -1.6, 3.5]} intensity={2.2} color="#d6b27a" />
      <directionalLight position={[-2, 3, -4]} intensity={0.85} color="#efe4cf" />
      <CandleLight />
      <directionalLight position={[2.5, 2, -1]} intensity={0.18} color="#7f8794" />
      <pointLight position={[-0.6, 0.8, -2.4]} intensity={0.45} distance={6} />
      <Suspense fallback={null}>
        <EyeRig reaction={reaction} focusPulse={focusPulse} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
