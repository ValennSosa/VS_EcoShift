import * as THREE from "three";
import {
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  STREET_XS,
  STREET_ZS,
  ZONE_LAYOUT,
} from "../layout.js";
import { createRng, rngRange } from "../rng.js";
import { addInstanced } from "./instancing.js";

function tagPool(mesh, pool) {
  if (!mesh) return null;
  mesh.userData.visualPool = pool;
  return mesh;
}

/**
 * Geometrías compartidas de vegetación urbana.
 * Copas = icosaedros (no esferas); tronco cónico.
 */
export function createTreeGeometries() {
  return {
    trunk: new THREE.CylinderGeometry(0.12, 0.22, 1, 10),
    canopy: new THREE.IcosahedronGeometry(0.55, 1),
    canopySmall: new THREE.IcosahedronGeometry(0.32, 1),
    branch: new THREE.CylinderGeometry(0.035, 0.06, 1, 6),
  };
}

/**
 * @param {THREE.Group} parent
 * @param {{ mats: Record<string, THREE.Material> }} landscapeMats
 * @param {ReturnType<typeof createTreeGeometries>} geos
 * @param {number} seed
 * @param {Array} disposables
 */
export function placeUrbanTrees(parent, landscapeMats, geos, seed, disposables, density = 1) {
  const rng = createRng(seed ^ 0x7ee5);
  const { mats } = landscapeMats;
  const group = new THREE.Group();
  group.name = "urban-trees";
  parent.add(group);

  const arrays = emptyTreeArrays();
  const spacing = density < 0.8 ? 5.2 : 3.85;

  for (const p of collectSidewalkTreePoints(rng, spacing)) {
    pushTree(arrays, rng, {
      x: p.x,
      z: p.z,
      species: "street",
      height: rngRange(rng, 1.15, 1.55),
    });
  }

  const lotEdges = [
    { lot: ZONE_LAYOUT.residential, count: 4 },
    { lot: ZONE_LAYOUT.commercial, count: 3 },
    { lot: ZONE_LAYOUT.transport, count: 2 },
    { lot: ZONE_LAYOUT.industrial, count: 2 },
  ];
  for (const { lot, count } of lotEdges) {
    for (let i = 0; i < count; i += 1) {
      const edge = i % 4;
      let x = lot.cx;
      let z = lot.cz;
      if (edge === 0) {
        x = lot.cx - lot.halfX + 0.18;
        z = lot.cz + rngRange(rng, -lot.halfZ + 0.35, lot.halfZ - 0.35);
      } else if (edge === 1) {
        x = lot.cx + lot.halfX - 0.18;
        z = lot.cz + rngRange(rng, -lot.halfZ + 0.35, lot.halfZ - 0.35);
      } else if (edge === 2) {
        z = lot.cz - lot.halfZ + 0.18;
        x = lot.cx + rngRange(rng, -lot.halfX + 0.35, lot.halfX - 0.35);
      } else {
        z = lot.cz + lot.halfZ - 0.18;
        x = lot.cx + rngRange(rng, -lot.halfX + 0.35, lot.halfX - 0.35);
      }
      pushTree(arrays, rng, {
        x,
        z,
        species: "lot",
        height: rngRange(rng, 0.95, 1.35),
      });
    }
  }

  const pools = flushTreeArrays(group, geos, mats, arrays, "vegetation");
  disposables.push(geos.trunk, geos.canopy, geos.canopySmall, geos.branch);
  group.userData.visualPools = { vegetation: pools };
  return group;
}

export function emptyTreeArrays() {
  return {
    trunks: [],
    branches: [],
    canopyDeep: [],
    canopyLight: [],
    canopyAccent: [],
  };
}

export function flushTreeArrays(parent, geos, mats, arrays, poolName = "vegetation") {
  const meshes = [
    tagPool(addInstanced(parent, geos.trunk, mats.bark, arrays.trunks, true), poolName),
    tagPool(addInstanced(parent, geos.branch, mats.bark, arrays.branches, false), poolName),
    tagPool(addInstanced(parent, geos.canopy, mats.foliageDeep, arrays.canopyDeep, true), poolName),
    tagPool(
      addInstanced(parent, geos.canopySmall, mats.foliageLight, arrays.canopyLight, false),
      poolName
    ),
    tagPool(
      addInstanced(parent, geos.canopySmall, mats.foliageAccent, arrays.canopyAccent, false),
      poolName
    ),
  ].filter(Boolean);
  return meshes;
}

/**
 * @param {ReturnType<typeof emptyTreeArrays>} arrays
 * @param {() => number} rng
 * @param {{ x:number, z:number, height:number, species?: string }} cfg
 */
export function pushTree(arrays, rng, cfg) {
  const h = cfg.height;
  const x = cfg.x;
  const z = cfg.z;
  const species = cfg.species || "park";

  arrays.trunks.push({
    x,
    y: h * 0.42,
    z,
    sx: 0.55 + h * 0.12,
    sy: h * 0.85,
    sz: 0.55 + h * 0.12,
  });

  const branchCount = species === "street" ? 2 : 3;
  for (let i = 0; i < branchCount; i += 1) {
    const ang = (i / branchCount) * Math.PI * 2 + rngRange(rng, -0.2, 0.2);
    const by = h * rngRange(rng, 0.48, 0.74);
    const reach = h * rngRange(rng, 0.22, 0.36);
    arrays.branches.push({
      x: x + Math.cos(ang) * reach * 0.42,
      y: by,
      z: z + Math.sin(ang) * reach * 0.42,
      sx: 0.85,
      sy: reach,
      sz: 0.85,
      ry: ang,
      tilt: Math.PI / 2.4,
    });
  }

  const canopyY = h * (species === "street" ? 0.95 : 0.88);
  const mainScale = species === "street" ? h * 0.55 : h * 0.7;
  arrays.canopyDeep.push({
    x,
    y: canopyY,
    z,
    sx: mainScale * rngRange(rng, 0.9, 1.1),
    sy: mainScale * rngRange(rng, 0.75, 0.95),
    sz: mainScale * rngRange(rng, 0.9, 1.1),
  });

  const lobes = species === "street" ? 2 : 4;
  for (let i = 0; i < lobes; i += 1) {
    const ang = (i / lobes) * Math.PI * 2 + rngRange(rng, -0.25, 0.25);
    const rad = mainScale * rngRange(rng, 0.35, 0.55);
    const entry = {
      x: x + Math.cos(ang) * rad,
      y: canopyY + rngRange(rng, -0.12, 0.18) * h,
      z: z + Math.sin(ang) * rad,
      sx: mainScale * rngRange(rng, 0.45, 0.7),
      sy: mainScale * rngRange(rng, 0.4, 0.65),
      sz: mainScale * rngRange(rng, 0.45, 0.7),
    };
    if (i % 2 === 0) arrays.canopyLight.push(entry);
    else arrays.canopyAccent.push(entry);
  }
}

function collectSidewalkTreePoints(rng, spacing = 3.85) {
  const points = [];
  const halfRoad = ROAD_WIDTH / 2;
  const walkMid = halfRoad + SIDEWALK_WIDTH * 0.55;
  const zMin = STREET_ZS[0] + ROAD_WIDTH;
  const zMax = STREET_ZS[STREET_ZS.length - 1] - ROAD_WIDTH;
  const xMin = STREET_XS[0] + ROAD_WIDTH;
  const xMax = STREET_XS[STREET_XS.length - 1] - ROAD_WIDTH;

  for (const sx of STREET_XS) {
    for (const side of [-1, 1]) {
      for (let z = zMin + 1.1; z <= zMax - 1.1; z += spacing) {
        if (STREET_ZS.some((sz) => Math.abs(sz - z) < ROAD_WIDTH * 0.85)) continue;
        points.push({
          x: sx + side * walkMid + rngRange(rng, -0.06, 0.06),
          z: z + rngRange(rng, -0.12, 0.12),
        });
      }
    }
  }

  for (const sz of STREET_ZS) {
    for (const side of [-1, 1]) {
      for (let x = xMin + 1.1; x <= xMax - 1.1; x += spacing) {
        if (STREET_XS.some((sx) => Math.abs(sx - x) < ROAD_WIDTH * 0.85)) continue;
        if (STREET_XS.some((sx) => Math.abs(sx - x) < 1.4)) continue;
        points.push({
          x: x + rngRange(rng, -0.12, 0.12),
          z: sz + side * walkMid + rngRange(rng, -0.06, 0.06),
        });
      }
    }
  }

  return points;
}
