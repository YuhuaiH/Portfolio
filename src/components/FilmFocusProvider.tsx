"use client";

import { createContext, useContext, useMemo, useState } from "react";

type FilmFocusContextValue = {
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
};

const FilmFocusContext = createContext<FilmFocusContextValue | null>(null);

// Shared between FilmRollsExplorer (which sets this as rolls are clicked)
// and SceneHeader (which reads it to show the focused roll's name/date
// instead of the default "N rolls" heading). The two live in different
// parts of the tree — SceneHeader is rendered once in the root layout,
// outside the routed page content — so plain prop drilling can't connect
// them; a small context does.
export function FilmFocusProvider({ children }: { children: React.ReactNode }) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const value = useMemo(() => ({ focusedIndex, setFocusedIndex }), [focusedIndex]);
  return <FilmFocusContext.Provider value={value}>{children}</FilmFocusContext.Provider>;
}

export function useFilmFocus() {
  const ctx = useContext(FilmFocusContext);
  if (!ctx) throw new Error("useFilmFocus must be used within FilmFocusProvider");
  return ctx;
}
