import * as THREE from "three";

/**
 * Estadísticas de escena Three.js (proxies de coste + geometría).
 * @param {THREE.Object3D} root
 * @param {THREE.WebGLRenderer} [renderer]
 */
export function collectSceneStats(root, renderer = null) {
  let meshes = 0;
  let instancedMeshes = 0;
  let instances = 0;
  let triangles = 0;
  let shadowCasters = 0;
  /** @type {Set<THREE.Material>} */
  const materials = new Set();
  /** @type {Set<THREE.Texture>} */
  const textures = new Set();
  /** @type {Set<THREE.BufferGeometry>} */
  const geoSet = new Set();

  root.traverse((obj) => {
    if (obj.isInstancedMesh) {
      instancedMeshes += 1;
      instances += obj.count || 0;
      meshes += 1;
      if (obj.castShadow) shadowCasters += 1;
      countMesh(obj, materials, textures, geoSet);
      triangles += estimateTriangles(obj.geometry) * (obj.count || 0);
      return;
    }
    if (obj.isMesh) {
      meshes += 1;
      if (obj.castShadow) shadowCasters += 1;
      countMesh(obj, materials, textures, geoSet);
      triangles += estimateTriangles(obj.geometry);
    }
  });

  let drawCalls = null;
  let programs = null;
  let texturesGpu = null;
  if (renderer?.info) {
    drawCalls = renderer.info.render.calls;
    programs = renderer.info.programs?.length ?? null;
    texturesGpu = renderer.info.memory.textures;
  }

  return {
    meshes,
    instancedMeshes,
    instances,
    triangles,
    geometries: geoSet.size,
    materials: materials.size,
    textures: textures.size,
    shadowCasters,
    drawCalls,
    programs,
    texturesGpu,
    textureBytesApprox: estimateTextureBytes(textures),
  };
}

function countMesh(mesh, materials, textures, geoSet) {
  if (mesh.geometry) geoSet.add(mesh.geometry);
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    if (!mat) continue;
    materials.add(mat);
    for (const key of [
      "map",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "aoMap",
      "emissiveMap",
      "alphaMap",
    ]) {
      if (mat[key]) textures.add(mat[key]);
    }
  }
}

function estimateTriangles(geometry) {
  if (!geometry) return 0;
  const index = geometry.index;
  if (index) return Math.floor(index.count / 3);
  const pos = geometry.getAttribute("position");
  return pos ? Math.floor(pos.count / 3) : 0;
}

function estimateTextureBytes(textures) {
  let bytes = 0;
  for (const tex of textures) {
    const img = tex.image;
    if (!img) continue;
    const w = img.width || img.videoWidth || 0;
    const h = img.height || img.videoHeight || 0;
    if (w && h) bytes += w * h * 4;
  }
  return bytes;
}

/**
 * Mide FPS durante `durationMs` con render fijo.
 * @param {{
 *   renderer: THREE.WebGLRenderer,
 *   scene: THREE.Scene,
 *   camera: THREE.Camera,
 *   durationMs?: number,
 *   warmupMs?: number,
 *   onFrame?: () => void,
 * }} opts
 */
export async function measureFps(opts) {
  const {
    renderer,
    scene,
    camera,
    durationMs = 2000,
    warmupMs = 600,
    onFrame,
  } = opts;

  await runFrames(renderer, scene, camera, warmupMs, onFrame);

  const samples = [];
  let last = performance.now();
  const start = performance.now();

  await new Promise((resolve) => {
    const tick = (now) => {
      onFrame?.();
      renderer.render(scene, camera);
      const dt = now - last;
      if (dt > 0 && dt < 500) samples.push(1000 / dt);
      last = now;
      if (now - start < durationMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  samples.sort((a, b) => a - b);
  const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
  const min = samples[0] || 0;
  const max = samples.at(-1) || 0;
  const p5 = samples[Math.floor(samples.length * 0.05)] || min;
  const p95 = samples[Math.floor(samples.length * 0.95)] || max;

  renderer.info.reset();
  renderer.render(scene, camera);
  const info = renderer.info.render;

  return {
    samples: samples.length,
    avg: round1(avg),
    min: round1(min),
    max: round1(max),
    p5: round1(p5),
    p95: round1(p95),
    drawCalls: info.calls,
    trianglesRendered: info.triangles,
  };
}

function runFrames(renderer, scene, camera, durationMs, onFrame) {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = (now) => {
      onFrame?.();
      renderer.render(scene, camera);
      if (now - start < durationMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
