/**
 * Detección de WebGL y preferencia de representación (3D | SVG).
 * Sin dependencias de Three.js.
 */

export const CITY_VIEW_STORAGE_KEY = "vs-ecoshift:city-view";

export function detectWebGL() {
  try {
    if (window.localStorage?.getItem("vs-ecoshift:force-no-webgl") === "1") {
      return false;
    }
  } catch {
    // ignore
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/**
 * Prioridad: ?city=svg|3d → localStorage → capacidad WebGL.
 * @returns {"3d" | "svg"}
 */
export function resolveCityViewMode() {
  const query = new URLSearchParams(window.location.search).get("city");
  if (query === "svg" || query === "3d") return query;

  try {
    const stored = window.localStorage.getItem(CITY_VIEW_STORAGE_KEY);
    if (stored === "svg" || stored === "3d") return stored;
  } catch {
    // ignore quota / private mode
  }

  return detectWebGL() ? "3d" : "svg";
}

export function isCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
