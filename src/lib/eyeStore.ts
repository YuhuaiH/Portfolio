"use client";

import { useSyncExternalStore } from "react";

// The bridge between the home page's hero (EyeHero.tsx, plain DOM) and the
// eye itself, which lives inside the site-wide 3D background scene
// (SpaceBackground.tsx → SceneEye in EyeStage.tsx) so it shares that
// scene's lighting and fog. The hero says *where* the eye should sit (an
// anchor element the eye lines itself up behind, every frame), whether it
// should be there at all, and what it should be doing; the scene reads all
// of it per frame. A plain mutable object rather than React state: these
// change every hover and are read inside the render loop, and none of it
// should re-render the 3D scene.
export type EyeReaction = { dir: readonly [number, number]; dilate: boolean } | null;

type EyeState = {
  // The hero's eye box — the eye is drawn centered on it, sized to it.
  anchor: HTMLElement | null;
  // Whether the eye should be on screen. Leaving the home page sets this
  // false, which plays the eye's retreat down the canyon.
  present: boolean;
  // Ever been present this visit — the model only loads once it has.
  wanted: boolean;
  reaction: EyeReaction;
  // Bumped per hover/click; the eye plays a pupil "focus" pulse per bump.
  focusPulse: number;
  // The model and its textures have loaded.
  ready: boolean;
};

export const eyeState: EyeState = {
  anchor: null,
  present: false,
  wanted: false,
  reaction: null,
  focusPulse: 0,
  ready: false,
};

// Subscriptions for the two changes React does need to hear about: the
// model becoming ready (EyeHero starts its entrance) and the eye first
// being wanted (SpaceBackground mounts it).
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function setEyePresent(present: boolean) {
  eyeState.present = present;
  if (present && !eyeState.wanted) {
    eyeState.wanted = true;
    notify();
  }
}

export function setEyeReady() {
  if (eyeState.ready) return;
  eyeState.ready = true;
  notify();
}

export function useEyeReady() {
  return useSyncExternalStore(subscribe, () => eyeState.ready, () => false);
}

export function useEyeWanted() {
  return useSyncExternalStore(subscribe, () => eyeState.wanted, () => false);
}
