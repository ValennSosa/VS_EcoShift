/**
 * Etapa 1: selección de vista 3D / SVG sin DOM de Three.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_VIEW_STORAGE_KEY,
  detectWebGL,
  resolveCityViewMode,
} from "../js/city3d/detect.js";

test("detectWebGL es una función pura de capacidad", () => {
  assert.equal(typeof detectWebGL, "function");
  // En Node no hay WebGL de navegador.
  assert.equal(detectWebGL(), false);
});

test("resolveCityViewMode respeta ?city=svg y ?city=3d", () => {
  const original = globalThis.window;
  const storage = new Map();

  globalThis.window = {
    location: { search: "?city=svg" },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    matchMedia: () => ({ matches: false }),
  };

  assert.equal(resolveCityViewMode(), "svg");

  globalThis.window.location.search = "?city=3d";
  assert.equal(resolveCityViewMode(), "3d");

  globalThis.window.location.search = "";
  storage.set(CITY_VIEW_STORAGE_KEY, "svg");
  assert.equal(resolveCityViewMode(), "svg");

  globalThis.window = original;
});
