import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { getAssetEntry, resolveAssetUrl } from "./catalog.js";
import { disposeObjectTree, disposeTextureLike } from "./disposeGltf.js";
import { normalizeModel } from "./normalize.js";

const DEFAULT_TIMEOUT_MS = 45000;

/**
 * Cargador de assets city3d con caché, timeout, progreso y dispose.
 */
export function createAssetLoader(options = {}) {
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const loadingManager = new THREE.LoadingManager();
  const gltfLoader = new GLTFLoader(loadingManager);
  const hdrLoader = new HDRLoader(loadingManager);

  /** @type {Map<string, Promise<object>>} */
  const cache = new Map();
  /** @type {Map<string, object>} */
  const resolved = new Map();
  /** @type {Set<() => void>} */
  const progressListeners = new Set();

  let bytesKnown = 0;
  let itemsTotal = 0;
  let itemsLoaded = 0;

  loadingManager.onStart = () => emitProgress();
  loadingManager.onProgress = (_url, loaded, total) => {
    itemsLoaded = loaded;
    itemsTotal = total;
    emitProgress();
  };
  loadingManager.onLoad = () => emitProgress();
  loadingManager.onError = (url) => {
    console.warn("AssetLoader: error de LoadingManager", url);
  };

  function emitProgress() {
    const payload = {
      itemsLoaded,
      itemsTotal,
      ratio: itemsTotal > 0 ? itemsLoaded / itemsTotal : 0,
      cacheSize: cache.size,
      bytesKnown,
    };
    for (const listener of progressListeners) listener(payload);
  }

  /**
   * @param {(progress: object) => void} listener
   * @returns {() => void}
   */
  function onProgress(listener) {
    progressListeners.add(listener);
    return () => progressListeners.delete(listener);
  }

  /**
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} factory
   * @returns {Promise<T>}
   */
  function cached(key, factory) {
    if (resolved.has(key)) return Promise.resolve(resolved.get(key));
    if (cache.has(key)) return cache.get(key);
    const promise = withTimeout(factory(), timeoutMs, key)
      .then((value) => {
        resolved.set(key, value);
        return value;
      })
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, promise);
    return promise;
  }

  /**
   * @param {string} id
   * @returns {Promise<{ id: string, entry: object, scene: import("three").Group, gltf: object, normalized: object }>}
   */
  async function loadModel(id) {
    return cached(`model:${id}`, async () => {
      const entry = await getAssetEntry(id);
      if (entry.kind !== "model") {
        throw new Error(`El asset ${id} no es un modelo (${entry.kind}).`);
      }
      const url = resolveAssetUrl(entry);
      const gltf = await loadGltfUrl(url);
      const scene = gltf.scene || gltf.scenes?.[0];
      if (!scene) throw new Error(`GLTF sin escena: ${id}`);
      scene.name = `asset-${id}`;
      const normalized = normalizeModel(scene, entry.normalize || {});
      return { id, entry, scene, gltf, normalized };
    });
  }

  /**
   * @param {string} url
   * @returns {Promise<object>}
   */
  function loadGltfUrl(url) {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error instanceof Error ? error : new Error(String(error)))
      );
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<{ id: string, entry: object, texture: import("three").DataTexture }>}
   */
  async function loadHdr(id) {
    return cached(`hdri:${id}`, async () => {
      const entry = await getAssetEntry(id);
      if (entry.kind !== "hdri") {
        throw new Error(`El asset ${id} no es HDRI (${entry.kind}).`);
      }
      const url = resolveAssetUrl(entry);
      const texture = await new Promise((resolve, reject) => {
        hdrLoader.load(
          url,
          (tex) => resolve(tex),
          undefined,
          (error) => reject(error instanceof Error ? error : new Error(String(error)))
        );
      });
      texture.mapping = THREE.EquirectangularReflectionMapping;
      return { id, entry, texture };
    });
  }

  /**
   * Carga progresiva de una lista de ids (modelos y/o hdri).
   * Continúa tras fallos individuales y reporta errores.
   *
   * @param {string[]} ids
   * @returns {Promise<{ ok: object[], errors: { id: string, error: Error }[] }>}
   */
  async function loadMany(ids) {
    const ok = [];
    const errors = [];
    for (const id of ids) {
      try {
        const entry = await getAssetEntry(id);
        const result = entry.kind === "hdri" ? await loadHdr(id) : await loadModel(id);
        ok.push(result);
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
    return { ok, errors };
  }

  function has(id) {
    return resolved.has(`model:${id}`) || resolved.has(`hdri:${id}`);
  }

  /**
   * @param {{ disposeGpu?: boolean }} [opts]
   * disposeGpu=false cuando hay clones que comparten geometría/material con la plantilla.
   */
  function dispose(opts = {}) {
    const disposeGpu = opts.disposeGpu !== false;
    if (disposeGpu) {
      for (const value of resolved.values()) {
        if (value?.scene) disposeObjectTree(value.scene);
        if (value?.texture) disposeTextureLike(value.texture);
      }
    }
    resolved.clear();
    cache.clear();
    progressListeners.clear();
    itemsLoaded = 0;
    itemsTotal = 0;
  }

  return {
    loadModel,
    loadHdr,
    loadGltfUrl,
    loadMany,
    onProgress,
    has,
    dispose,
    get cacheSize() {
      return resolved.size;
    },
  };
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Timeout cargando asset (${ms} ms): ${label}`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}
