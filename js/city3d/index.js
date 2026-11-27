/**
 * Fachada de la ciudad 3D.
 * Sin fórmulas de simulación ni acceso a localStorage de escenarios.
 */

import { loadFacadeKit } from "./architecture/facadeKit.js";
import { createOrthoCamera, resetCamera, updateOrthoFrustum } from "./camera.js";
import { createControls } from "./controls.js";
import { disposeList } from "./dispose.js";
import { loadLandscapeMaterials } from "./landscape/materials.js";
import { loadPlantKit } from "./landscape/plantKit.js";
import { createLights } from "./lights.js";
import { resolveQualityProfile } from "./quality/profile.js";
import { createRenderer, resizeRenderer } from "./renderer.js";
import { createScene } from "./scene.js";
import { createTramaMaterials } from "./trama/materials.js";
import { loadTramaTextureKit } from "./trama/textureKit.js";
import { createCityWorld } from "./world.js";

/**
 * @param {{ host: HTMLElement, quality?: string | null }} options
 */
export async function createCity3D({ host, quality: qualityId = null }) {
  if (!host) throw new Error("Falta el contenedor de la ciudad 3D.");

  host.replaceChildren();
  host.classList.add("city3d-host");

  const quality = resolveQualityProfile(qualityId);

  const scene = createScene();
  const camera = createOrthoCamera();
  const renderer = createRenderer(host, quality);
  const controls = createControls(camera, renderer.domElement);
  createLights(scene, renderer, quality);

  let textureKit = null;
  let tramaMaterials = null;
  let facadeKit = null;
  let landscapeMats = null;
  let plantKit = null;

  try {
    textureKit = await loadTramaTextureKit();
    tramaMaterials = createTramaMaterials(textureKit.maps);
  } catch (error) {
    console.warn("Trama PBR: texturas no disponibles, se usan materiales planos.", error);
    tramaMaterials = createTramaMaterials(null);
  }

  try {
    facadeKit = await loadFacadeKit();
  } catch (error) {
    console.warn("Arquitectura R2: no se pudo cargar el kit de fachadas.", error);
  }

  try {
    landscapeMats = await loadLandscapeMaterials();
  } catch (error) {
    console.warn("Paisaje R3: materiales no disponibles.", error);
  }

  if (quality.plantKit) {
    try {
      plantKit = await loadPlantKit();
    } catch (error) {
      console.warn("Paisaje R3: plantas Poly Haven no disponibles.", error);
    }
  }

  const world = createCityWorld(scene, {
    tramaMaterials,
    textureKit,
    facadeKit,
    landscapeMats,
    plantKit,
    quality,
  });

  let rafId = 0;
  let disposed = false;

  const applySize = () => {
    if (disposed) return;
    resizeRenderer(renderer, camera, host, updateOrthoFrustum, quality);
  };

  applySize();

  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => applySize()) : null;
  if (resizeObserver) {
    resizeObserver.observe(host);
  } else {
    window.addEventListener("resize", applySize);
  }

  const tick = () => {
    if (disposed) return;
    rafId = window.requestAnimationFrame(tick);
    if (controls.enableDamping) controls.update();
    // Actualizar LOD de edificios según distancia a cámara
    world.root?.traverse((obj) => {
      if (obj.isLOD) obj.update(camera);
    });
    renderer.render(scene, camera);
  };
  tick();

  return {
    mode: "3d",
    quality: quality.id,
    applyVisualState(states) {
      world.applyVisualState(states);
    },
    resetCamera() {
      resetCamera(camera, controls);
      renderer.render(scene, camera);
    },
    getZones() {
      return world.zones;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", applySize);
      controls.dispose();
      world.architecture?.disposeTemplates?.();
      world.root.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      scene.remove(world.root);
      disposeList(world.disposables);
      renderer.dispose();
      renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      host.replaceChildren();
      host.classList.remove("city3d-host");
    },
  };
}

export { detectWebGL, resolveCityViewMode } from "./detect.js";
