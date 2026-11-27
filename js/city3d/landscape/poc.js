/**
 * PoC de validación visual del paisaje urbano (R3).
 * Incluye trama R1 + arquitectura R2 + vegetación/movilidad/mobiliario.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadFacadeKit } from "../architecture/facadeKit.js";
import { buildProceduralCity } from "../buildCity.js";
import { disposeList } from "../dispose.js";
import { createTramaMaterials } from "../trama/materials.js";
import { loadTramaTextureKit } from "../trama/textureKit.js";
import { applyQualityProfile, resolveQualityProfile } from "../quality/profile.js";
import { loadLandscapeMaterials } from "./materials.js";
import { loadPlantKit } from "./plantKit.js";

const VIEWS = {
  elevated: { pos: [22, 18, 22], target: [0, 0.4, 0] },
  oblique: { pos: [14, 8, 16], target: [0, 0.8, 0] },
  street: { pos: [3.9, 1.35, 11.5], target: [3.75, 0.9, 0] },
  park: { pos: [2.5, 3.2, 6.5], target: [0, 0.6, 0] },
  buildings: { pos: [-9, 4.5, -4], target: [-7.5, 1.8, -7.5] },
};

/**
 * @param {{
 *   host: HTMLElement,
 *   statusEl?: HTMLElement | null,
 *   onReady?: (info: object) => void,
 *   onError?: (error: Error) => void,
 * }} options
 */
export async function createLandscapePoc({ host, statusEl = null, onReady, onError }) {
  if (!host) throw new Error("Falta el contenedor de la PoC de paisaje.");

  host.replaceChildren();
  host.classList.add("city3d-poc-host");

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  setStatus("Cargando trama, arquitectura y paisaje…");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c342b);
  scene.fog = new THREE.Fog(0x0c342b, 30, 58);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(...VIEWS.oblique.pos);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "city3d-poc-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(...VIEWS.oblique.target);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2.5;
  controls.maxDistance = 48;

  const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x31443a, 0.5);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.55);
  sun.position.set(14, 22, 10);
  const quality = resolveQualityProfile("desktop");
  applyQualityProfile(quality, { renderer, sun });
  scene.add(hemi, sun, sun.target);

  let disposed = false;
  let rafId = 0;
  let world = null;
  const stats = {
    startedAt: performance.now(),
    loadedAt: 0,
    fps: 0,
    framesInSample: 0,
    lastFpsSample: performance.now(),
  };

  try {
    setStatus("Texturas trama…");
    const textureKit = await loadTramaTextureKit();
    const tramaMaterials = createTramaMaterials(textureKit.maps);

    setStatus("Kit de fachadas…");
    const facadeKit = await loadFacadeKit();

    setStatus("Materiales y plantas de paisaje…");
    const landscapeMats = await loadLandscapeMaterials();
    const plantKit = quality.plantKit ? await loadPlantKit() : null;

    world = buildProceduralCity(scene, {
      tramaMaterials,
      textureKit,
      facadeKit,
      landscapeMats,
      plantKit,
      quality,
    });

    stats.loadedAt = performance.now();
    const trees = countNamed(world.root, "urban-trees");
    const mobility = countNamed(world.root, "urban-mobility");
    setStatus(
      `Paisaje listo · carga ${Math.round(stats.loadedAt - stats.startedAt)} ms · árboles+movilidad activos`
    );
    onReady?.({
      loadMs: Math.round(stats.loadedAt - stats.startedAt),
      hasTrees: trees > 0,
      hasMobility: mobility > 0,
      buildings: world.architecture?.buildings?.length || 0,
      getFps: () => stats.fps,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setStatus(`Error paisaje: ${err.message}`);
    onError?.(err);
    throw err;
  }

  const applySize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(width, height, false);
  };
  applySize();

  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => applySize()) : null;
  if (resizeObserver) resizeObserver.observe(host);
  else window.addEventListener("resize", applySize);

  const tick = () => {
    if (disposed) return;
    rafId = window.requestAnimationFrame(tick);
    stats.framesInSample += 1;
    const now = performance.now();
    if (now - stats.lastFpsSample >= 500) {
      stats.fps = Math.round((stats.framesInSample * 1000) / (now - stats.lastFpsSample));
      stats.framesInSample = 0;
      stats.lastFpsSample = now;
    }
    controls.update();
    world?.root?.traverse((obj) => {
      if (obj.isLOD) obj.update(camera);
    });
    renderer.render(scene, camera);
  };
  tick();

  return {
    setView(name) {
      const view = VIEWS[name] || VIEWS.oblique;
      camera.position.set(...view.pos);
      controls.target.set(...view.target);
      controls.update();
    },
    getFps() {
      return stats.fps;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", applySize);
      controls.dispose();
      world?.architecture?.disposeTemplates?.();
      world?.root?.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      if (world?.root) scene.remove(world.root);
      disposeList(world?.disposables || []);
      renderer.dispose();
      host.replaceChildren();
      host.classList.remove("city3d-poc-host");
    },
  };
}

function countNamed(root, name) {
  let n = 0;
  root.traverse((obj) => {
    if (obj.name === name) n += 1;
  });
  return n;
}
