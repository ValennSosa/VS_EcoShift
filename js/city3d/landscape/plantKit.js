import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { normalizeModel } from "../assets/normalize.js";

const MODELS = {
  shrub: {
    url: new URL(
      "../../../assets/city3d/models/shrub_04/shrub_04_1k.gltf",
      import.meta.url
    ).href,
    targetSize: 0.95,
  },
  fern: {
    url: new URL("../../../assets/city3d/models/fern_02/fern_02_1k.gltf", import.meta.url)
      .href,
    targetSize: 0.55,
  },
  pot: {
    url: new URL(
      "../../../assets/city3d/models/potted_plant_04/potted_plant_04_1k.gltf",
      import.meta.url
    ).href,
    targetSize: 0.7,
  },
};

/**
 * Carga plantillas Poly Haven livianas (arbusto, helecho, maceta).
 * @returns {Promise<{
 *   templates: Record<string, THREE.Object3D>,
 *   clone: (id: string) => THREE.Object3D,
 *   dispose: () => void,
 * }>}
 */
export async function loadPlantKit() {
  const loader = new GLTFLoader();
  /** @type {Record<string, THREE.Object3D>} */
  const templates = {};
  /** @type {THREE.Object3D[]} */
  const roots = [];

  for (const [id, cfg] of Object.entries(MODELS)) {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(cfg.url, resolve, undefined, (err) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    const scene = gltf.scene || gltf.scenes?.[0];
    if (!scene) throw new Error(`Plant kit sin escena: ${id}`);
    normalizeModel(scene, { targetSize: cfg.targetSize, groundToOrigin: true });
    scene.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      for (const mat of mats) {
        if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.55;
      }
    });
    templates[id] = scene;
    roots.push(scene);
  }

  return {
    templates,
    clone(id) {
      const source = templates[id];
      if (!source) throw new Error(`Plantilla vegetal desconocida: ${id}`);
      return source.clone(true);
    },
    dispose() {
      // Geometría/materiales se liberan con dispose de la escena city.
      roots.length = 0;
    },
  };
}
