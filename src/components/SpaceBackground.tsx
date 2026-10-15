"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// A site-wide deep-space backdrop: two canyon walls of asteroid rubble
// receding toward a faint warm glow on the horizon, gold dust and
// four-point sparkles hanging in the gap, and a few huge out-of-focus rocks
// and bokeh right up against the lens. The depth comes from three things,
// none of them expensive: exponential fog (far rocks fade to black), real
// perspective (the walls converge on their own), and a camera that drifts
// a little toward the cursor, so near layers slide past far ones.
//
// Cost is kept flat on purpose: every rock is one InstancedMesh (a single
// draw call), the dust is one Points, nothing is post-processed (the
// "blur" on foreground bokeh is baked into its sprite texture, not a
// depth-of-field pass), and the canvas renders at most 1.5× DPR.

// Pale, desaturated warm gold — the color of the eye's own glow, not a
// saturated UI accent. The first pass used a punchier #e2b65c, which made
// every sprite read as a glowing game pickup.
const GOLD = new THREE.Color("#d9c08a");

// A tiny deterministic PRNG, so the layout is identical on every load
// (and between the server-rendered and hydrated client) instead of the
// rocks reshuffling each visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 3D value noise + fractal sum (fBm) — the thing that makes a rock
// read as weathered stone rather than a lumpy ball. Sine-wave bumps (the
// first version of this) repeat too regularly and come out looking
// modelled-by-hand; layered noise gives the irregular, self-similar
// crags real rock has at every scale.
function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  );
}

function fbm(x: number, y: number, z: number, octaves: number) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += (valueNoise(x * freq, y * freq, z * freq) - 0.5) * amp;
    freq *= 2.05;
    amp *= 0.5;
  }
  return sum;
}

// A rock: an icosphere displaced by fBm along its own surface, with a
// couple of flat "fracture" faces sliced off so it reads as broken stone
// rather than an eroded pebble. mergeVertices first: IcosahedronGeometry
// is non-indexed (each corner duplicated per face), which would give
// faceted per-face normals — the low-poly look this replaced. Welded, the
// normals average across faces and the shading goes smooth, while the
// noise supplies all the actual surface detail.
//
// Also bakes a per-vertex tone into a color attribute: crevices (pushed
// in) darker, ridges (pushed out) lighter — a cheap stand-in for ambient
// occlusion that gives each rock some of the tonal variation real stone
// has instead of one flat paint color.
function makeRockGeometry(seed: number, detail: number) {
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo);
  const rand = mulberry32(seed);
  const off = [rand() * 100, rand() * 100, rand() * 100];
  const cuts = [0, 1].map(() =>
    new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
  );
  const cutDepth = [0.55 + rand() * 0.25, 0.6 + rand() * 0.25];
  const stretch = new THREE.Vector3(1 + rand() * 0.5, 0.65 + rand() * 0.3, 0.9 + rand() * 0.4);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const big = fbm(v.x * 1.1 + off[0], v.y * 1.1 + off[1], v.z * 1.1 + off[2], 3);
    const fine = fbm(v.x * 4.5 + off[1], v.y * 4.5 + off[2], v.z * 4.5 + off[0], 3);
    const n = big * 0.75 + fine * 0.22;
    v.multiplyScalar(1 + n);
    // Fracture planes: clamp anything past the plane back onto it.
    cuts.forEach((dir, k) => {
      const d = v.dot(dir);
      if (d > cutDepth[k]) v.addScaledVector(dir, (cutDepth[k] - d) * 0.92);
    });
    v.multiply(stretch);
    pos.setXYZ(i, v.x, v.y, v.z);
    const tone = THREE.MathUtils.clamp(0.72 + n * 1.6 + fine * 0.6, 0.35, 1.15);
    colors[i * 3] = tone;
    colors[i * 3 + 1] = tone * 0.97;
    colors[i * 3 + 2] = tone * 0.92;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Soft round sprite for dust and bokeh — the falloff here *is* the blur.
function makeGlowTexture(hardness: number) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(hardness, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// The four-point "✦" glint: two thin tapered spikes plus a soft core.
function makeSparkleTexture() {
  const size = 128;
  const c = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.35);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(c - dx * c, c - dy * c);
    ctx.lineTo(c + dy * 1.5, c + dx * 1.5);
    ctx.lineTo(c + dx * c, c + dy * c);
    ctx.lineTo(c - dy * 1.5, c - dx * 1.5);
    ctx.closePath();
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

type RockSpec = { pos: [number, number, number]; scale: number; rot: [number, number, number] };

function layoutRocks(): RockSpec[] {
  const rand = mulberry32(270);
  const rocks: RockSpec[] = [];
  const rot = (): [number, number, number] => [rand() * 6.3, rand() * 6.3, rand() * 6.3];

  // The two canyon walls: dense rubble bands either side of a clear
  // channel down the middle, running from just behind the camera out into
  // the fog. Weighted toward the bottom so the walls read as rising out of
  // a floor rather than floating as two vertical slabs.
  for (let i = 0; i < 520; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 4 - rand() * 70;
    const depth = (4 - z) / 74; // 0 near → 1 far
    const inner = 3.4 + depth * 1.5;
    const x = side * (inner + Math.pow(rand(), 1.6) * 9);
    const y = -4.5 + Math.pow(rand(), 1.8) * 9 + (Math.abs(x) - inner) * 0.35;
    const scale = 0.12 + Math.pow(rand(), 2.4) * 1.4;
    rocks.push({ pos: [x, y, z], scale, rot: rot() });
  }
  // A sparse rocky floor between the walls, below the eye line.
  for (let i = 0; i < 90; i++) {
    const z = 2 - rand() * 60;
    rocks.push({
      pos: [(rand() - 0.5) * 9, -4.2 - rand() * 1.2, z],
      scale: 0.08 + Math.pow(rand(), 2) * 0.5,
      rot: rot(),
    });
  }
  // Loose debris drifting in the channel itself — the small floating
  // rocks around the eye in the mock.
  for (let i = 0; i < 26; i++) {
    rocks.push({
      pos: [(rand() - 0.5) * 7, (rand() - 0.5) * 5, -2 - rand() * 18],
      scale: 0.06 + rand() * 0.16,
      rot: rot(),
    });
  }
  // A handful of big rocks practically on the lens, in the corners —
  // these are the dark silhouettes framing the shot.
  const near: RockSpec[] = [
    { pos: [-4.6, -2.6, 3.2], scale: 1.1, rot: rot() },
    { pos: [4.9, -2.9, 2.6], scale: 1.3, rot: rot() },
    { pos: [-5.4, 2.4, 1.5], scale: 0.7, rot: rot() },
    { pos: [5.6, 2.8, 0.6], scale: 0.6, rot: rot() },
  ];
  return rocks.concat(near);
}

// Four rock shapes so the field doesn't read as one rock copy-pasted, each
// in two detail levels: the few dozen rocks close enough to see properly
// get a dense mesh, the hundreds deep in the fog get a light one (at that
// distance the extra triangles would be invisible anyway).
const ROCK_VARIANTS = 4;
const NEAR_Z = -16;

function RockBatch({ specs, seed, detail }: { specs: RockSpec[]; seed: number; detail: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => makeRockGeometry(seed, detail), [seed, detail]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    specs.forEach((rock, i) => {
      q.setFromEuler(e.set(...rock.rot));
      s.setScalar(rock.scale);
      p.set(...rock.pos);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [specs]);

  if (specs.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, specs.length]}>
      {/* Near-black, fully rough, no metalness: stone, not plastic. All
          the color comes from the baked tones and the warm key light. */}
      <meshStandardMaterial color="#2b2723" roughness={1} metalness={0} vertexColors />
    </instancedMesh>
  );
}

function Rocks() {
  const batches = useMemo(() => {
    const all = layoutRocks();
    const out: { key: string; specs: RockSpec[]; seed: number; detail: number }[] = [];
    for (let variant = 0; variant < ROCK_VARIANTS; variant++) {
      const mine = all.filter((_, i) => i % ROCK_VARIANTS === variant);
      const seed = 101 + variant * 37;
      out.push({ key: `near-${variant}`, specs: mine.filter((r) => r.pos[2] > NEAR_Z), seed, detail: 10 });
      out.push({ key: `far-${variant}`, specs: mine.filter((r) => r.pos[2] <= NEAR_Z), seed, detail: 3 });
    }
    return out;
  }, []);

  return (
    <>
      {batches.map((b) => (
        <RockBatch key={b.key} specs={b.specs} seed={b.seed} detail={b.detail} />
      ))}
    </>
  );
}

function Dust({ count, spread, size, opacity, seed }: {
  count: number;
  spread: [number, number, number];
  size: number;
  opacity: number;
  seed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const texture = useMemo(() => makeGlowTexture(0.25), []);
  const positions = useMemo(() => {
    const rand = mulberry32(seed);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * spread[0];
      arr[i * 3 + 1] = (rand() - 0.5) * spread[1];
      arr[i * 3 + 2] = 4 - rand() * spread[2];
    }
    return arr;
  }, [count, spread, seed]);

  // A very slow sideways swirl, so the dust is visibly suspended in
  // something rather than painted onto the backdrop.
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.004;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        color={GOLD}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const SPARKLES: { pos: [number, number, number]; size: number; speed: number }[] = [
  { pos: [-5.2, 2.6, -6], size: 0.32, speed: 0.35 },
  { pos: [6.4, 0.9, -7], size: 0.45, speed: 0.25 },
  { pos: [3.2, 3.9, -12], size: 0.28, speed: 0.3 },
  { pos: [-2.4, -1.4, -5], size: 0.18, speed: 0.45 },
  { pos: [-7.5, -0.4, -14], size: 0.3, speed: 0.28 },
];

function Sparkles() {
  const texture = useMemo(() => makeSparkleTexture(), []);
  const refs = useRef<(THREE.Sprite | null)[]>([]);

  // Each glint breathes on its own phase — a twinkle, not a blink.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const { size, speed } = SPARKLES[i];
      const k = 0.7 + 0.3 * Math.sin(t * speed + i * 1.7);
      sprite.scale.setScalar(size * k);
      sprite.material.opacity = 0.35 + 0.4 * k;
    });
  });

  return (
    <>
      {SPARKLES.map((s, i) => (
        <sprite
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={s.pos}
          scale={s.size}
        >
          <spriteMaterial
            map={texture}
            color={GOLD}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
      ))}
    </>
  );
}

// Big soft discs right in front of the lens — fake depth-of-field, the
// blurry gold highlights in the corners of the mock.
const BOKEH: { pos: [number, number, number]; size: number; opacity: number }[] = [
  { pos: [-3.4, -1.9, 4.6], size: 1.4, opacity: 0.1 },
  { pos: [3.8, -2.2, 4.2], size: 1.1, opacity: 0.13 },
  { pos: [4.4, 1.8, 3.8], size: 0.8, opacity: 0.06 },
];

function Bokeh() {
  const texture = useMemo(() => makeGlowTexture(0.6), []);
  return (
    <>
      {BOKEH.map((b, i) => (
        <sprite key={i} position={b.pos} scale={b.size}>
          <spriteMaterial
            map={texture}
            color={GOLD}
            transparent
            opacity={b.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
      ))}
    </>
  );
}

// The faint warm haze far down the canyon that the rocks are lit by and
// silhouetted against.
function HorizonGlow() {
  const texture = useMemo(() => makeGlowTexture(0.15), []);
  return (
    <sprite position={[0, -2.5, -45]} scale={[70, 18, 1]}>
      <spriteMaterial
        map={texture}
        color="#4a3d26"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </sprite>
  );
}

// Parallax: the camera eases a little way toward the cursor and back, plus
// a slow idle bob so the scene never sits fully still. Listens on window
// because the canvas itself is pointer-events:none (it's behind the page).
function CameraRig({ still }: { still: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);

  useFrame(({ clock, camera }, dt) => {
    if (still) return;
    const t = clock.elapsedTime;
    const tx = pointer.current.x * 0.6 + Math.sin(t * 0.13) * 0.15;
    const ty = 0.3 - pointer.current.y * 0.35 + Math.sin(t * 0.17) * 0.08;
    const k = 1 - Math.exp(-dt * 1.5);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.lookAt(0, -0.3, -40);
  });

  return null;
}

export default function SpaceBackground({ animate = true }: { animate?: boolean }) {
  // prefers-reduced-motion (or LAYERS.animate=false) renders one still
  // frame and stops — the scene stays, the per-frame cost doesn't.
  const still = useMemo(
    () =>
      !animate ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    [animate]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={still ? "demand" : "always"}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        camera={{ position: [0, 0.3, 8], fov: 55, near: 0.1, far: 120 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.3, -40)}
      >
        <color attach="background" args={["#040403"]} />
        <fogExp2 attach="fog" args={["#050504", 0.055]} />
        {/* Key light from far down the canyon (behind the eye), so the
            rocks' inner faces catch a warm rim and their outer faces fall
            into shadow — the gold edges in the mock. */}
        <pointLight position={[0, 0, -24]} color="#d6b27a" intensity={2.4} decay={0} distance={0} />
        <directionalLight position={[-4, 7, 5]} color="#7f8794" intensity={0.22} />
        <ambientLight intensity={0.05} />
        <HorizonGlow />
        <Rocks />
        <Dust count={1200} spread={[30, 16, 70]} size={0.035} opacity={0.45} seed={11} />
        <Dust count={120} spread={[14, 8, 20]} size={0.07} opacity={0.55} seed={42} />
        <Sparkles />
        <Bokeh />
        <CameraRig still={still} />
      </Canvas>
    </div>
  );
}
