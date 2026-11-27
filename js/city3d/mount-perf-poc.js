import { runCityBenchmark } from "./perf/benchmark.js";

const host = document.querySelector("[data-city3d-perf-poc]");
const statusEl = document.querySelector("[data-city3d-perf-status]");
const outEl = document.querySelector("[data-city3d-perf-out]");

if (!host) throw new Error("Falta [data-city3d-perf-poc]");

const params = new URLSearchParams(window.location.search);
const profileId = params.get("profile") || "desktop";
const mode = params.get("mode") || "optimized"; // optimized | baseline
const layer = params.get("layer") || "full"; // full | r1 | r2 | r3 | r1r2

const layers =
  layer === "r1"
    ? { trama: true, architecture: false, landscape: false }
    : layer === "r2"
      ? { trama: false, architecture: true, landscape: false }
      : layer === "r3"
        ? { trama: true, architecture: false, landscape: true }
        : layer === "r1r2"
          ? { trama: true, architecture: true, landscape: false }
          : { trama: true, architecture: true, landscape: true };

const baselineOverrides =
  mode === "baseline"
    ? {
        mergeBuildings: false,
        buildingLod: false,
        shadows: profileId !== "mobile",
        shadowMapSize: 2048,
        plantKit: true,
        landscapeDensity: 1,
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      }
    : null;

let bench = null;

try {
  bench = await runCityBenchmark({
    host,
    statusEl,
    layers,
    profileId,
    profileOverrides: baselineOverrides,
  });

  if (outEl) {
    outEl.textContent = JSON.stringify(bench.results, null, 2);
  }
  console.info("[perf-poc]", bench.results);
  window.__ECOSHIFT_PERF__ = bench.results;
} catch (error) {
  console.error(error);
  if (statusEl) statusEl.textContent = `Error: ${error.message}`;
}

for (const button of document.querySelectorAll("[data-cam]")) {
  button.addEventListener("click", () => {
    bench?.setView?.(button.getAttribute("data-cam"));
  });
}

window.addEventListener("pagehide", () => {
  bench?.dispose?.();
  bench = null;
});
