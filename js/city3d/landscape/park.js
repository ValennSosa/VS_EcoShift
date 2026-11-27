import * as THREE from "three";
import { ZONE_LAYOUT } from "../layout.js";
import { createRng, rngRange } from "../rng.js";
import { addInstanced } from "./instancing.js";
import { emptyTreeArrays, flushTreeArrays, pushTree } from "./trees.js";

/**
 * Parque central rediseñado: senderos, lago, arboleda, bancos e iluminación.
 * @param {import("three").Group} zoneGroup
 * @param {{ mats: Record<string, THREE.Material> }} landscapeMats
 * @param {object} treeGeos
 * @param {object} furnitureGeos
 * @param {number} seed
 * @param {Array} disposables
 * @param {Awaited<ReturnType<import("./plantKit.js").loadPlantKit>> | null} plantKit
 */
export function buildCentralPark(
  zoneGroup,
  landscapeMats,
  treeGeos,
  furnitureGeos,
  seed,
  disposables,
  plantKit
) {
  const rng = createRng(seed ^ 0x9a7c);
  const { mats } = landscapeMats;
  const L = ZONE_LAYOUT.green;
  const group = new THREE.Group();
  group.name = "central-park";
  zoneGroup.add(group);

  const geoBox = furnitureGeos.box;

  // Plaza pavimentada SO
  placeBox(group, geoBox, mats.concreteLite, L.cx - 0.95, 0.05, L.cz - 0.9, 1.05, 0.06, 0.9, 0);

  // Lago / espejo de agua
  placeBox(group, geoBox, mats.water, L.cx + 0.45, 0.045, L.cz + 0.2, 1.35, 0.04, 0.95, 0.12);

  // Senderos peatonales (cruz + anillo suave)
  placeBox(group, geoBox, mats.pathStone, L.cx, 0.04, L.cz - 0.05, 0.38, 0.025, L.halfZ * 1.65, 0);
  placeBox(group, geoBox, mats.pathStone, L.cx + 0.05, 0.04, L.cz + 0.55, L.halfX * 1.45, 0.025, 0.32, 0);
  placeBox(group, geoBox, mats.pathStone, L.cx - 0.55, 0.04, L.cz + 0.15, 0.28, 0.025, 1.4, 0.35);
  placeBox(group, geoBox, mats.pathStone, L.cx + 0.75, 0.04, L.cz - 0.55, 0.95, 0.025, 0.28, -0.25);

  // Canteros ornamentales
  const bedGeo = new THREE.BoxGeometry(1, 1, 1);
  disposables.push(bedGeo);
  const beds = [
    { x: L.cx - 1.15, z: L.cz + 0.85, sx: 0.7, sz: 0.45 },
    { x: L.cx + 1.15, z: L.cz - 0.95, sx: 0.65, sz: 0.5 },
    { x: L.cx - 0.15, z: L.cz + 1.15, sx: 0.9, sz: 0.35 },
  ];
  for (const bed of beds) {
    placeBox(group, bedGeo, mats.concreteLite, bed.x, 0.06, bed.z, bed.sx, 0.08, bed.sz, 0);
    placeBox(group, bedGeo, mats.foliageAccent, bed.x, 0.12, bed.z, bed.sx * 0.85, 0.06, bed.sz * 0.8, 0);
  }

  // Árboles del parque (diseño, no aleatorio puro)
  const treeArrays = emptyTreeArrays();
  const parkTreePlan = [
    { x: -1.35, z: -1.1, h: 1.65, species: "park" },
    { x: -1.45, z: 0.35, h: 1.4, species: "park" },
    { x: -1.2, z: 1.15, h: 1.25, species: "lot" },
    { x: 1.25, z: -1.2, h: 1.55, species: "park" },
    { x: 1.4, z: 0.15, h: 1.35, species: "park" },
    { x: 1.15, z: 1.05, h: 1.2, species: "lot" },
    { x: -0.35, z: -1.25, h: 1.1, species: "street" },
    { x: 0.55, z: -1.3, h: 1.05, species: "street" },
    { x: -0.55, z: 1.25, h: 1.3, species: "park" },
    { x: 0.35, z: 1.35, h: 1.15, species: "lot" },
    { x: 0.95, z: -0.15, h: 0.95, species: "street" },
    { x: -0.9, z: -0.35, h: 1.0, species: "street" },
  ];
  for (const t of parkTreePlan) {
    // Evitar lago
    if (Math.hypot(t.x - 0.45, t.z - 0.2) < 0.85) continue;
    pushTree(treeArrays, rng, {
      x: L.cx + t.x + rngRange(rng, -0.05, 0.05),
      z: L.cz + t.z + rngRange(rng, -0.05, 0.05),
      height: t.h,
      species: t.species,
    });
  }
  const vegetationPools = flushTreeArrays(group, treeGeos, mats, treeArrays, "vegetation");
  group.userData.visualPools = { vegetation: vegetationPools };

  // Bancos orientados a senderos / lago
  const benches = [];
  const legs = [];
  const benchPlan = [
    { x: -0.55, z: -0.35, ry: Math.PI / 2 },
    { x: 0.55, z: -0.35, ry: -Math.PI / 2 },
    { x: -0.15, z: 0.85, ry: 0 },
    { x: 0.95, z: 0.55, ry: -0.4 },
    { x: -1.0, z: -0.85, ry: 0.3 },
    { x: 0.2, z: -0.95, ry: 0 },
  ];
  for (const b of benchPlan) {
    const x = L.cx + b.x;
    const z = L.cz + b.z;
    benches.push({ x, y: 0.22, z, sx: 0.7, sy: 0.08, sz: 0.24, ry: b.ry });
    legs.push(
      { x: x - 0.22, y: 0.1, z, sx: 0.06, sy: 0.18, sz: 0.06 },
      { x: x + 0.22, y: 0.1, z, sx: 0.06, sy: 0.18, sz: 0.06 }
    );
  }
  addInstanced(group, furnitureGeos.box, mats.woodBench, benches, true);
  addInstanced(group, furnitureGeos.box, mats.metalUrban, legs, true);

  // Luminarias de parque
  const poles = [];
  const glows = [];
  const lampPlan = [
    [-1.5, -1.35],
    [1.5, -1.35],
    [-1.5, 1.35],
    [1.5, 1.35],
    [0, -1.45],
    [0.15, 1.4],
  ];
  for (const [ox, oz] of lampPlan) {
    const x = L.cx + ox;
    const z = L.cz + oz;
    poles.push({ x, y: 0.7, z, sx: 0.06, sy: 1.25, sz: 0.06 });
    glows.push({ x, y: 1.3, z, sx: 0.14, sy: 0.1, sz: 0.14 });
  }
  addInstanced(group, furnitureGeos.pole, mats.lampPost, poles, true);
  addInstanced(group, furnitureGeos.glow, mats.lampGlow, glows, false);

  // Papeleras en accesos
  const bins = [
    { x: L.cx - 1.35, z: L.cz - 0.15 },
    { x: L.cx + 1.35, z: L.cz + 0.35 },
    { x: L.cx, z: L.cz - 1.35 },
  ];
  addInstanced(
    group,
    furnitureGeos.bin,
    mats.binBody,
    bins.map((b) => ({ ...b, y: 0.22, sx: 0.22, sy: 0.4, sz: 0.22 })),
    true
  );

  // Plantas PH adicionales en canteros
  if (plantKit) {
    for (let i = 0; i < beds.length; i += 1) {
      const bed = beds[i];
      const clone = plantKit.clone(i % 2 === 0 ? "shrub" : "fern");
      clone.position.set(bed.x, 0.12, bed.z);
      clone.scale.multiplyScalar(rngRange(rng, 0.55, 0.75));
      clone.rotation.y = rngRange(rng, 0, Math.PI * 2);
      clone.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = false;
      });
      group.add(clone);
    }
  }

  return group;
}

function placeBox(parent, geo, mat, x, y, z, sx, sy, sz, ry) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.y = ry || 0;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
