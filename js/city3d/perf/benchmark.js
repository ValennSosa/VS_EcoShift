/**
 * Benchmark reproducible de la ciudad 3D (R1 / R2 / R3 / full).
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadFacadeKit } from "../architecture/facadeKit.js";
import { buildProceduralCity } from "../buildCity.js";
import { disposeList } from "../dispose.js";
import { loadLandscapeMaterials } from "../landscape/materials.js";
import { loadPlantKit } from "../landscape/plantKit.js";
import { createTramaMaterials } from "../trama/materials.js";
import { loadTramaTextureKit } from "../trama/textureKit.js";
import { collectSceneStats, measureFps } from "./stats.js";
import {
  applyQualityProfile,
  resolveQualityProfile,
  QUALITY_PROFILES,
} from "../quality/profile.js";

export const BENCH_VIEWS = Object.freeze({
  elevated: { pos: [22, 18, 22], target: [0, 0.4, 0] },
  oblique: { pos: [14, 8, 16], target: [0, 0.8, 0] },
  street: { pos: [3.9, 1.35, 11.5], target: [3.75, 0.9, 0] },
});

/**
 * @param {{
 *   host: HTMLElement,
 *   statusEl?: HTMLElement | null,
 *   layers?: { trama?: boolean, architecture?: boolean, landscape?: boolean },
 *   profileId?: string | null,
 *   profileOverrides?: object | null,
 *   forceShadows?: boolean | null,
 * }} options
 */
export async function runCityBenchmark(options) {
  const {
    host,
    statusEl = null,
    layers = { trama: true, architecture: true, landscape: true },
    profileId = null,
    profileOverrides = null,
    forceShadows = null,
  } = options;

  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };

  host.replaceChildren();
  host.classList.add("city3d-poc-host");

  const base =
    profileId && QUALITY_PROFILES[profileId]
      ? { ...QUALITY_PROFILES[profileId] }
      : resolveQualityProfile(profileId);
  const profile = profileOverrides ? { ...base, ...profileOverrides } : base;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c342b);
  scene.fog = new THREE.Fog(0x0c342b, 32, 60);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(...BENCH_VIEWS.elevated.pos);

  const renderer = new THREE.WebGLRenderer({
    antialias: profile.antialias,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "city3d-poc-canvas";
  host.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.target.set(...BENCH_VIEWS.elevated.target);

  const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x31443a, 0.5);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.5);
  sun.position.set(14, 22, 10);
  scene.add(hemi, sun, sun.target);

  applyQualityProfile(profile, { renderer, sun, forceShadows });

  const applySize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(profile.pixelRatio);
    renderer.setSize(width, height, false);
  };
  applySize();

  const t0 = performance.now();
  setStatus(`Cargando (${profile.id})…`);

  let textureKit = null;
  let tramaMaterials = null;
  let facadeKit = null;
  let landscapeMats = null;
  let plantKit = null;

  if (layers.trama !== false) {
    textureKit = await loadTramaTextureKit();
    tramaMaterials = createTramaMaterials(textureKit.maps);
  }
  if (layers.architecture !== false) {
    facadeKit = await loadFacadeKit();
  }
  if (layers.landscape !== false) {
    landscapeMats = await loadLandscapeMaterials();
    if (profile.plantKit) {
      try {
        plantKit = await loadPlantKit();
      } catch {
        plantKit = null;
      }
    }
  }

  const world = buildProceduralCity(scene, {
    tramaMaterials,
    textureKit,
    facadeKit: layers.architecture === false ? null : facadeKit,
    landscapeMats: layers.landscape === false ? null : landscapeMats,
    plantKit: layers.landscape === false ? null : plantKit,
    quality: profile,
  });

  const loadMs = Math.round(performance.now() - t0);

  // Warm + stats
  setCameraView(camera, controls, "elevated");
  renderer.info.reset();
  renderer.render(scene, camera);
  const sceneStats = collectSceneStats(world.root, renderer);

  const results = {
    profile: profile.id,
    layers,
    loadMs,
    scene: sceneStats,
    views: {},
  };

  for (const viewName of Object.keys(BENCH_VIEWS)) {
    setStatus(`Midiendo ${viewName}…`);
    setCameraView(camera, controls, viewName);
    results.views[viewName] = await measureFps({
      renderer,
      scene,
      camera,
      durationMs: 1800,
      warmupMs: 400,
      onFrame: () => {
        world.root?.traverse((obj) => {
          if (obj.isLOD) obj.update(camera);
        });
      },
    });
  }

  setStatus(
    `Listo · ${profile.id} · carga ${loadMs} ms · meshes ${sceneStats.meshes} · tris ~${sceneStats.triangles}`
  );

  return {
    results,
    setView(name) {
      setCameraView(camera, controls, name);
      renderer.render(scene, camera);
    },
    dispose() {
      controls.dispose();
      world.architecture?.disposeTemplates?.();
      world.root?.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
      });
      if (world.root) scene.remove(world.root);
      disposeList(world.disposables || []);
      renderer.dispose();
      host.replaceChildren();
      host.classList.remove("city3d-poc-host");
    },
  };
}

function setCameraView(camera, controls, name) {
  const view = BENCH_VIEWS[name] || BENCH_VIEWS.elevated;
  camera.position.set(...view.pos);
  controls.target.set(...view.target);
  controls.update();
  camera.lookAt(controls.target);
}
