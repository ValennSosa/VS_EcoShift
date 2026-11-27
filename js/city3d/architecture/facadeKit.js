import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const KIT_URL = new URL(
  "../../../assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf",
  import.meta.url
).href;

/**
 * Carga e indexa el kit Modular Urban Apartments Facade (Poly Haven CC0).
 * Las plantillas se clonan; geometría/materiales se comparten.
 */
export async function loadFacadeKit() {
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(KIT_URL, resolve, undefined, (err) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });

  /** @type {Map<string, THREE.Object3D>} */
  const byName = new Map();
  const scene = gltf.scene || gltf.scenes?.[0];
  if (!scene) throw new Error("Kit de fachada sin escena.");

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (object.name && (object.isMesh || object.children?.length)) {
      // Preferir nodos con mesh directo
      if (object.isMesh || object.children.some((c) => c.isMesh)) {
        byName.set(object.name, object);
      }
    }
  });

  // Asegurar DoubleSide en materiales de muro delgado
  const materials = new Set();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    for (const mat of mats) {
      if (!mat || materials.has(mat)) continue;
      materials.add(mat);
      mat.side = THREE.DoubleSide;
      mat.shadowSide = THREE.DoubleSide;
      if ("envMapIntensity" in mat) mat.envMapIntensity = 0.65;
    }
  });

  /**
   * @param {string} name
   * @returns {THREE.Object3D}
   */
  function cloneModule(name) {
    const source = byName.get(name);
    if (!source) throw new Error(`Módulo de fachada no encontrado: ${name}`);
    const clone = source.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.updateMatrix();
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  }

  function has(name) {
    return byName.has(name);
  }

  function list(prefix = "") {
    return [...byName.keys()].filter((n) => n.startsWith(prefix)).sort();
  }

  return {
    gltf,
    scene,
    byName,
    cloneModule,
    has,
    list,
    dispose() {
      // Los clones en ciudad comparten geo/mat: no disponer aquí si hay instancias vivas.
      // La ciudad libera al dispose general solo recursos exclusivos si hace falta.
    },
  };
}

/** Nombres canónicos usados por el ensamblador. */
export const MODULE_RECIPES = {
  wall: {
    plain: "wall_standard_standard_01",
    doorSmall: "wall_door_centered_small_01",
    doorLarge: "wall_door_centered_large_01",
    winSmall: "wall_window_centered_small_01",
    winLarge: "wall_window_centered_large_01",
    winDouble: "wall_window_centered_double_01",
    winOffset: "wall_window_offset_small_01",
  },
  window: {
    small: "window_centered_small_01",
    large: "window_centered_large_01",
    double: "window_centered_double_01",
    offset: "window_offset_small_01",
  },
  door: {
    small: "door_centered_small_01",
    large: "door_centered_large_01",
  },
  trim: {
    base: "base_standard_01",
    dado: "dado_standard_standard_01",
    cornice: "cornice_standard_standard_01",
    crown: "crown_standard_standard_01",
    corner: "wall_standard_corner_large_01",
    baseCorner: "base_corner_large_01",
    corniceCorner: "cornice_standard_corner_large_01",
    crownCorner: "crown_standard_corner_large_01",
  },
};
