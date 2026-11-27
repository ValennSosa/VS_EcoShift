import * as THREE from "three";
import { ZONE_DEFINITIONS } from "../sim/zones.js";
import { placeArchitecture } from "./architecture/placeCity.js";
import {
  CITY_SEED,
  ZONE_LAYOUT,
  getCityLayout,
} from "./layout.js";
import { placeLandscape } from "./landscape/place.js";
import { createCityMaterials } from "./materials.js";
import { createRng, rngRange } from "./rng.js";
import { buildUrbanTrama } from "./trama/buildTrama.js";
import { createVisualController } from "./visual/applyVisualState.js";
import { INITIAL_VARIABLES } from "../sim/engine.js";
import { calculateZoneStates } from "../sim/zones.js";

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Ciudad 3D: trama R1 + arquitectura R2 + paisaje urbano R3.
 *
 * @param {THREE.Scene} scene
 * @param {{
 *   tramaMaterials?: { mats: Record<string, THREE.Material>, dispose: () => void },
 *   textureKit?: { dispose: () => void },
 *   facadeKit?: object,
 *   landscapeMats?: { mats: Record<string, THREE.Material>, dispose: () => void },
 *   plantKit?: object | null,
 *   quality?: import("./quality/profile.js").QualityProfile | null,
 * }} options
 */
export function buildProceduralCity(scene, options = {}) {
  const rng = createRng(CITY_SEED);
  const materialKit = createCityMaterials();
  const { mats } = materialKit;
  const tramaMaterials = options.tramaMaterials || null;
  const quality = options.quality || null;

  const geos = createSharedGeometries();
  const disposables = [...Object.values(geos), materialKit];
  if (tramaMaterials) disposables.push(tramaMaterials);
  if (options.textureKit) disposables.push(options.textureKit);

  const root = new THREE.Group();
  root.name = "ecoshift-city";
  scene.add(root);

  const zones = {};
  for (const definition of ZONE_DEFINITIONS) {
    const group = new THREE.Group();
    group.name = `zone-${definition.id}`;
    group.userData.zoneId = definition.id;
    root.add(group);
    zones[definition.id] = { id: definition.id, group, meshes: [] };
  }

  const tramaMats = tramaMaterials?.mats || {
    asphalt: mats.asphalt,
    sidewalk: mats.sidewalk,
    grass: mats.grass,
    park: mats.park,
    lot: mats.sidewalk,
    curb: mats.curb,
    marking: mats.marker,
    crosswalk: mats.marker,
    water: mats.water,
    path: mats.path,
  };
  const trama = buildUrbanTrama(root, { mats: tramaMats });
  disposables.push(...trama.disposables);

  // Campo solar en energía (además del edificio eco)
  buildEnergyField(zones.energy, geos, mats, rng, disposables);

  let architecture = null;
  if (options.facadeKit) {
    architecture = placeArchitecture({
      zones,
      root,
      kit: options.facadeKit,
      quality,
      mats: {
        park: tramaMats.park || mats.park,
        solar: mats.solar,
        metal: mats.metal,
        roof: mats.roof,
        foliage: options.landscapeMats?.mats?.foliageDeep || mats.foliage,
        core: mats.facadeCool,
      },
    });
  } else {
    console.warn("Ciudad 3D: sin facadeKit; se omite arquitectura R2.");
  }

  let landscape = null;
  if (options.landscapeMats) {
    landscape = placeLandscape({
      root,
      zones,
      landscapeMats: options.landscapeMats,
      plantKit: options.plantKit || null,
      quality,
    });
    disposables.push(...landscape.disposables);
  } else {
    console.warn("Ciudad 3D: sin landscapeMats; se omite paisaje R3.");
  }

  const visual = createVisualController(root);
  // Estado inicial coherente antes del primer frame
  visual.apply(calculateZoneStates(INITIAL_VARIABLES));

  return {
    root,
    zones,
    layout: getCityLayout(),
    trama,
    architecture,
    landscape,
    quality,
    visual,
    disposables,
    applyVisualState(states) {
      return visual.apply(states || calculateZoneStates(INITIAL_VARIABLES));
    },
  };
}

function createSharedGeometries() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  };
}

function placeBox(parent, geo, mat, x, y, z, sx, sy, sz, ry = 0, cast = true) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.y = ry;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addInstanced(parent, geo, mat, transforms, disposables, cast = true) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  mesh.userData.maxCount = transforms.length;
  mesh.count = transforms.length;
  for (let i = 0; i < transforms.length; i += 1) {
    const t = transforms[i];
    _position.set(t.x, t.y, t.z);
    _euler.set(0, t.ry || 0, 0);
    _quaternion.setFromEuler(_euler);
    _scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    _matrix.compose(_position, _quaternion, _scale);
    mesh.setMatrixAt(i, _matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function buildEnergyField(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.energy;

  const panels = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = L.cx - 1.05 + col * 0.7;
      const z = L.cz - 0.95 + row * 0.55;
      panels.push({ x, y: 0.42, z, sx: 0.55, sy: 0.045, sz: 0.4, ry: 0.32 });
      placeBox(group, geos.box, mats.metal, x, 0.2, z, 0.06, 0.32, 0.06, 0, false);
    }
  }

  const nodes = [];
  for (let i = 0; i < 3; i += 1) {
    nodes.push({
      x: L.cx + rngRange(rng, -1.1, 0.2),
      y: 0.28,
      z: L.cz + 1.15,
      sx: 0.18,
      sy: 0.35,
      sz: 0.18,
    });
  }

  const solarMesh = addInstanced(group, geos.box, mats.solar, panels, disposables, false);
  if (solarMesh) solarMesh.userData.visualPool = "solarField";
  const nodeMesh = addInstanced(group, geos.box, mats.lampGlow, nodes, disposables, false);
  if (nodeMesh) nodeMesh.userData.visualPool = "efficiencyNodes";
  zone.meshes.push(solarMesh, nodeMesh);
  group.userData.visualPools = {
    solarField: [solarMesh].filter(Boolean),
    efficiencyNodes: [nodeMesh].filter(Boolean),
  };
}
