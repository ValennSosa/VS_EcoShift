/**
 * PoC de validación visual de la trama urbana (R1).
 * Sin edificios GLB ni contenido zonal de juguete.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { disposeList } from "../dispose.js";
import { buildUrbanTrama } from "./buildTrama.js";
import { createTramaMaterials } from "./materials.js";
import { loadTramaTextureKit } from "./textureKit.js";

/**
 * @param {{
 *   host: HTMLElement,
 *   statusEl?: HTMLElement | null,
 *   onReady?: (info: object) => void,
 *   onError?: (error: Error) => void,
 * }} options
 */
export async function createTramaPoc({ host, statusEl = null, onReady, onError }) {
  if (!host) throw new Error("Falta el contenedor de la PoC de trama.");

  host.replaceChildren();
  host.classList.add("city3d-poc-host");

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  setStatus("Cargando texturas PBR de trama…");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c342b);
  scene.fog = new THREE.Fog(0x0c342b, 28, 55);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(18, 14, 18);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "city3d-poc-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.2, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 6;
  controls.maxDistance = 48;

  const hemi = new THREE.HemisphereLight(0xdce9ff, 0x2a4036, 0.45);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.5);
  sun.position.set(16, 26, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.0008;
  scene.add(hemi, sun, sun.target);

  let textureKit = null;
  let tramaMaterials = null;
  let trama = null;
  let disposed = false;
  let rafId = 0;
  const stats = {
    startedAt: performance.now(),
    loadedAt: 0,
    fps: 0,
    framesInSample: 0,
    lastFpsSample: performance.now(),
  };

  try {
    textureKit = await loadTramaTextureKit();
    tramaMaterials = createTramaMaterials(textureKit.maps);
    trama = buildUrbanTrama(scene, tramaMaterials);
    stats.loadedAt = performance.now();
    setStatus(
      `Trama lista · ${trama.blocks.length} manzanas · carga ${Math.round(stats.loadedAt - stats.startedAt)} ms`
    );
    onReady?.({
      blocks: trama.blocks.length,
      loadMs: Math.round(stats.loadedAt - stats.startedAt),
      getFps: () => stats.fps,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setStatus(`Error trama: ${err.message}`);
    onError?.(err);
    throw err;
  }

  const applySize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
  };
  applySize();

  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => applySize()) : null;
  if (resizeObserver) resizeObserver.observe(host);
  else window.addEventListener("resize", applySize);

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
    mode: "trama-poc",
    getFps: () => stats.fps,
    setView(name) {
      const presets = {
        iso: { pos: [18, 14, 18], target: [0, 0.2, 0] },
        street: { pos: [5.2, 2.4, 13.2], target: [0.5, 0.35, 4] },
        high: { pos: [6, 26, 10], target: [0, 0, 0] },
      };
      const preset = presets[name] || presets.iso;
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
      if (trama) {
        scene.remove(trama.root);
        disposeList(trama.disposables || []);
      }
      tramaMaterials?.dispose?.();
      textureKit?.dispose?.();
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
