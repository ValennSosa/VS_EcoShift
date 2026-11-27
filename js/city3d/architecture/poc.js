/**
 * PoC arquitectónica aislada (R2): tipologías a distintas distancias.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { assembleBuilding } from "./assemble.js";
import { TYPOLOGIES } from "./constants.js";
import { loadFacadeKit } from "./facadeKit.js";

/**
 * @param {{
 *   host: HTMLElement,
 *   statusEl?: HTMLElement | null,
 *   onReady?: (info: object) => void,
 *   onError?: (error: Error) => void,
 * }} options
 */
export async function createArchitecturePoc({ host, statusEl = null, onReady, onError }) {
  if (!host) throw new Error("Falta el contenedor de la PoC arquitectónica.");

  host.replaceChildren();
  host.classList.add("city3d-poc-host");

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  setStatus("Cargando kit de fachadas Poly Haven…");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c342b);
  scene.fog = new THREE.Fog(0x0c342b, 24, 48);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(10, 6, 14);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "city3d-poc-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.6, 0);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 3;
  controls.maxDistance = 40;

  const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x31443a, 0.5);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.55);
  sun.position.set(12, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0007;
  scene.add(hemi, sun, sun.target);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(18, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a3d32, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let disposed = false;
  let rafId = 0;
  let kit = null;
  /** @type {THREE.Object3D[]} */
  const placed = [];
  const stats = {
    startedAt: performance.now(),
    loadedAt: 0,
    fps: 0,
    framesInSample: 0,
    lastFpsSample: performance.now(),
  };

  const applySize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
  };
  applySize();
  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => applySize()) : null;
  if (resizeObserver) resizeObserver.observe(host);
  else window.addEventListener("resize", applySize);

  try {
    kit = await loadFacadeKit();
    setStatus("Ensamblando tipologías…");

    const ids = Object.keys(TYPOLOGIES);
    let cursor = -ids.length * 1.6;
    for (const id of ids) {
      const building = assembleBuilding(kit, id);
      building.position.x = cursor;
      scene.add(building);
      placed.push(building);
      cursor += 3.2;
    }

    stats.loadedAt = performance.now();
    setStatus(
      `Arquitectura lista · ${ids.length} tipologías · ${Math.round(stats.loadedAt - stats.startedAt)} ms`
    );
    onReady?.({
      typologies: ids,
      loadMs: Math.round(stats.loadedAt - stats.startedAt),
      getFps: () => stats.fps,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setStatus(`Error arquitectura: ${err.message}`);
    onError?.(err);
    throw err;
  }

  const tick = (now) => {
    if (disposed) return;
    rafId = window.requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
    stats.framesInSample += 1;
    if (now - stats.lastFpsSample >= 1000) {
      stats.fps = stats.framesInSample;
      stats.framesInSample = 0;
      stats.lastFpsSample = now;
    }
  };
  rafId = window.requestAnimationFrame(tick);

  return {
    mode: "architecture-poc",
    getFps: () => stats.fps,
    setView(name) {
      const presets = {
        elevated: { pos: [12, 9, 14], target: [0, 1.2, 0] },
        oblique: { pos: [9, 4.2, 11], target: [0, 1.3, 0] },
        street: { pos: [3.2, 1.35, 7.2], target: [-1.5, 1.2, 0] },
        facade: { pos: [-4.5, 1.8, 5.5], target: [-4.8, 1.5, 0] },
      };
      const preset = presets[name] || presets.oblique;
      camera.position.set(...preset.pos);
      controls.target.set(...preset.target);
      controls.update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", applySize);
      controls.dispose();
      for (const obj of placed) scene.remove(obj);
      placed.length = 0;
      kit = null;
      renderer.dispose();
      renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      host.replaceChildren();
      host.classList.remove("city3d-poc-host");
    },
  };
}
