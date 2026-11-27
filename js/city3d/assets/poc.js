/**
 * Prueba de concepto visual aislada (R0).
 * No modifica la ciudad procedural ni el simulador.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { listAssets } from "./catalog.js";
import { disposeObjectTree, disposeTextureLike } from "./disposeGltf.js";
import { createAssetLoader } from "./loader.js";
import { cloneNormalized } from "./normalize.js";

/**
 * @param {{
 *   host: HTMLElement,
 *   statusEl?: HTMLElement | null,
 *   onReady?: (info: object) => void,
 *   onError?: (error: Error) => void,
 * }} options
 */
export async function createAssetPoc({ host, statusEl = null, onReady, onError }) {
  if (!host) throw new Error("Falta el contenedor de la PoC de assets.");

  host.replaceChildren();
  host.classList.add("city3d-poc-host");

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c342b);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(7.5, 4.2, 9.5);

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
  controls.target.set(0, 1.4, 0);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2;
  controls.maxDistance = 40;

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x3a4a40, 0.45);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.35);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(hemi, sun, sun.target);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({
      color: 0x1a3d32,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(20, 20, 0x2f6b57, 0x184538);
  grid.position.y = 0.01;
  scene.add(grid);

  const loader = createAssetLoader({ timeoutMs: 60000 });
  const unsubProgress = loader.onProgress((progress) => {
    const pct = Math.round((progress.ratio || 0) * 100);
    setStatus(`Cargando assets… ${pct}% (${progress.itemsLoaded}/${progress.itemsTotal || "?"})`);
  });

  let disposed = false;
  let rafId = 0;
  let envRT = null;
  /** @type {import("three").Object3D[]} */
  const placed = [];
  const stats = {
    startedAt: performance.now(),
    loadedAt: 0,
    frames: 0,
    fps: 0,
    lastFpsSample: performance.now(),
    framesInSample: 0,
  };

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
    stats.frames += 1;
    stats.framesInSample += 1;
    if (now - stats.lastFpsSample >= 1000) {
      stats.fps = stats.framesInSample;
      stats.framesInSample = 0;
      stats.lastFpsSample = now;
      if (statusEl && stats.loadedAt) {
        statusEl.dataset.fps = String(stats.fps);
      }
    }
  };
  rafId = window.requestAnimationFrame(tick);

  try {
    const pocAssets = await listAssets({ poc: true });
    const modelIds = pocAssets.filter((a) => a.kind === "model").map((a) => a.id);
    const hdriIds = pocAssets.filter((a) => a.kind === "hdri").map((a) => a.id);

    if (hdriIds[0]) {
      const hdri = await loader.loadHdr(hdriIds[0]);
      const pmrem = new THREE.PMREMGenerator(renderer);
      envRT = pmrem.fromEquirectangular(hdri.texture);
      scene.environment = envRT.texture;
      pmrem.dispose();
      // Mantener fondo de marca; el HDRI solo ilumina materiales.
      disposeTextureLike(hdri.texture);
    }

    const { ok, errors } = await loader.loadMany(modelIds);
    if (!ok.length) {
      throw new Error(
        `No se pudo cargar ningún modelo PoC. ${errors.map((e) => e.id).join(", ")}`
      );
    }

    let cursorX = -3.2;
    for (const item of ok) {
      if (!item.scene) continue;
      const instance = cloneNormalized(item.scene);
      instance.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      instance.position.x = cursorX;
      scene.add(instance);
      placed.push(instance);
      cursorX += Math.max(3.4, (item.normalized?.size?.x || 2) * 0.65 + 1.2);
    }

    stats.loadedAt = performance.now();
    const loadMs = Math.round(stats.loadedAt - stats.startedAt);
    setStatus(
      `PoC lista · ${ok.length} modelo(s) · carga ${loadMs} ms` +
        (errors.length ? ` · avisos: ${errors.length}` : "")
    );

    onReady?.({
      models: ok.map((item) => item.id),
      errors,
      loadMs,
      getFps: () => stats.fps,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setStatus(`Error en PoC: ${err.message}`);
    onError?.(err);
    throw err;
  }

  return {
    mode: "assets-poc",
    getFps: () => stats.fps,
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(rafId);
      unsubProgress();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", applySize);
      controls.dispose();
      for (const obj of placed) {
        scene.remove(obj);
        disposeObjectTree(obj);
      }
      disposeObjectTree(ground);
      scene.remove(ground, grid, hemi, sun);
      if (envRT) {
        scene.environment = null;
        disposeTextureLike(envRT);
        envRT = null;
      }
      // Clones comparten geo/material con plantillas: liberar GPU solo desde `placed`.
      loader.dispose({ disposeGpu: false });
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
