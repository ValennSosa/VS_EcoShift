import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Fusiona meshes de un edificio por material compartido.
 * Reduce drásticamente draw calls preservando aspecto PBR.
 *
 * @param {THREE.Object3D} building
 * @param {{ castShadow?: boolean, receiveShadow?: boolean }} [options]
 * @returns {THREE.Object3D}
 */
export function mergeBuildingMeshes(building, options = {}) {
  const castShadow = options.castShadow !== false;
  const receiveShadow = options.receiveShadow !== false;

  building.updateMatrixWorld(true);

  /** @type {Map<THREE.Material, THREE.BufferGeometry[]>} */
  const byMaterial = new Map();
  /** @type {THREE.Object3D[]} */
  const toRemove = [];
  const invBuilding = new THREE.Matrix4().copy(building.matrixWorld).invert();
  const scratch = new THREE.Matrix4();

  building.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    if (Array.isArray(obj.material)) return;
    // Capas visuales R4: no fusionar (visibilidad dinámica).
    if (obj.userData?.visualLayer) return;
    const mat = obj.material;
    if (!mat || !obj.geometry) return;

    const geo = obj.geometry.clone();
    obj.updateWorldMatrix(true, false);
    scratch.copy(invBuilding).multiply(obj.matrixWorld);
    geo.applyMatrix4(scratch);

    if (!byMaterial.has(mat)) byMaterial.set(mat, []);
    byMaterial.get(mat).push(geo);
    toRemove.push(obj);
  });

  if (byMaterial.size === 0) return building;

  for (const obj of toRemove) {
    obj.parent?.remove(obj);
  }
  pruneEmptyGroups(building);

  const mergedRoot = new THREE.Group();
  mergedRoot.name = "merged-shell";
  let part = 0;

  for (const [mat, geos] of byMaterial) {
    const prepared = geos.map(prepareGeometry).filter(Boolean);
    if (!prepared.length) {
      for (const g of geos) g.dispose();
      continue;
    }

    let merged = null;
    try {
      merged = mergeGeometries(prepared, false);
    } catch (error) {
      console.warn("mergeBuilding: fallo merge, se omiten partes", error);
      merged = null;
    }
    for (const g of prepared) g.dispose();
    // originals already cloned into prepared
    for (const g of geos) {
      if (!prepared.includes(g)) g.dispose();
    }

    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = `merged-${part++}`;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mergedRoot.add(mesh);
  }

  building.add(mergedRoot);
  building.userData.merged = true;
  building.userData.mergedParts = mergedRoot.children.length;
  return building;
}

/**
 * Homogeneiza atributos al conjunto mínimo común usable.
 * @param {THREE.BufferGeometry} geo
 */
function prepareGeometry(geo) {
  if (!geo.getAttribute("position")) return null;

  // Conservar solo position / normal / uv para maximizar compatibilidad de merge
  const keep = new THREE.BufferGeometry();
  keep.setAttribute("position", geo.getAttribute("position").clone());

  if (geo.getAttribute("normal")) {
    keep.setAttribute("normal", geo.getAttribute("normal").clone());
  } else {
    keep.computeVertexNormals();
  }

  if (geo.getAttribute("uv")) {
    keep.setAttribute("uv", geo.getAttribute("uv").clone());
  } else {
    const count = keep.getAttribute("position").count;
    keep.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }

  if (geo.index) keep.setIndex(geo.index.clone());
  return keep;
}

function pruneEmptyGroups(root) {
  const groups = [];
  root.traverse((obj) => {
    if (obj !== root && obj.isGroup) groups.push(obj);
  });
  groups.reverse();
  for (const g of groups) {
    if (g.children.length === 0) g.parent?.remove(g);
  }
}
