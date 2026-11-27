import * as THREE from "three";
import { ROAD_WIDTH, SIDEWALK_WIDTH, STREET_XS, STREET_ZS, ZONE_LAYOUT } from "../layout.js";
import { createRng, rngRange } from "../rng.js";
import { addInstanced } from "./instancing.js";

export function createFurnitureGeometries() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    pole: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    glow: new THREE.SphereGeometry(0.5, 10, 8),
    bin: new THREE.CylinderGeometry(0.45, 0.5, 1, 10),
  };
}

/**
 * Mobiliario urbano: luminarias, bancos, papeleras, paradas, señalización.
 * @param {THREE.Group} parent
 * @param {{ mats: Record<string, THREE.Material> }} landscapeMats
 * @param {ReturnType<typeof createFurnitureGeometries>} geos
 * @param {number} seed
 * @param {Array} disposables
 */
export function placeStreetFurniture(parent, landscapeMats, geos, seed, disposables) {
  const rng = createRng(seed ^ 0xf41);
  const { mats } = landscapeMats;
  const group = new THREE.Group();
  group.name = "street-furniture";
  parent.add(group);

  const poles = [];
  const arms = [];
  const glows = [];
  const benches = [];
  const benchLegs = [];
  const bins = [];
  const signs = [];
  const shelters = [];
  const shelterPosts = [];

  const halfRoad = ROAD_WIDTH / 2;
  const walk = halfRoad + SIDEWALK_WIDTH * 0.78;

  // Luminarias en esquinas de intersección
  for (const sx of STREET_XS) {
    for (const sz of STREET_ZS) {
      // Una luminaria por intersección
      const dx = sx >= 0 ? walk : -walk;
      const dz = sz >= 0 ? walk : -walk;
      const x = sx + dx + rngRange(rng, -0.04, 0.04);
      const z = sz + dz + rngRange(rng, -0.04, 0.04);
      poles.push({ x, y: 0.85, z, sx: 0.07, sy: 1.55, sz: 0.07 });
      arms.push({ x: x + Math.sign(dx) * 0.18, y: 1.55, z, sx: 0.36, sy: 0.05, sz: 0.05 });
      glows.push({ x: x + Math.sign(dx) * 0.32, y: 1.48, z, sx: 0.14, sy: 0.1, sz: 0.14 });
    }
  }

  // Bancos y papeleras a lo largo de veredas (espaciados)
  for (const sx of STREET_XS) {
    for (const side of [-1, 1]) {
      for (let z = STREET_ZS[0] + 3.2; z <= STREET_ZS[3] - 3.2; z += 7.2) {
        if (STREET_ZS.some((sz) => Math.abs(sz - z) < ROAD_WIDTH)) continue;
        if (side > 0 && Math.abs(sx) > 8) continue; // menos bancos en ejes extremos
        const x = sx + side * walk;
        benches.push({ x, y: 0.22, z, sx: 0.55, sy: 0.08, sz: 0.22, ry: Math.PI / 2 });
        benchLegs.push(
          { x, y: 0.1, z: z - 0.14, sx: 0.06, sy: 0.18, sz: 0.06 },
          { x, y: 0.1, z: z + 0.14, sx: 0.06, sy: 0.18, sz: 0.06 }
        );
        if (rng() > 0.55) {
          bins.push({
            x: x + side * 0.28,
            y: 0.22,
            z: z + 0.55,
            sx: 0.22,
            sy: 0.4,
            sz: 0.22,
          });
        }
      }
    }
  }

  // Paradas de transporte en avenida sur y eje este
  const stops = [
    { x: STREET_XS[1], z: STREET_ZS[3] + walk, ry: 0 },
    { x: STREET_XS[2], z: STREET_ZS[0] - walk, ry: Math.PI },
    { x: STREET_XS[0] - walk, z: STREET_ZS[1], ry: -Math.PI / 2 },
  ];
  for (const stop of stops) {
    shelters.push({
      x: stop.x,
      y: 1.05,
      z: stop.z,
      sx: 1.35,
      sy: 0.05,
      sz: 0.55,
      ry: stop.ry,
    });
    shelterPosts.push(
      {
        x: stop.x + Math.cos(stop.ry) * 0.55,
        y: 0.55,
        z: stop.z + Math.sin(stop.ry) * 0.55,
        sx: 0.06,
        sy: 1.05,
        sz: 0.06,
      },
      {
        x: stop.x - Math.cos(stop.ry) * 0.55,
        y: 0.55,
        z: stop.z - Math.sin(stop.ry) * 0.55,
        sx: 0.06,
        sy: 1.05,
        sz: 0.06,
      }
    );
    // Panel lateral transparente
    placeMesh(group, geos.box, mats.glassTint, stop.x, 0.7, stop.z, 1.2, 0.7, 0.04, stop.ry);
    benches.push({
      x: stop.x,
      y: 0.22,
      z: stop.z + (Math.abs(stop.ry) < 0.1 ? -0.18 : 0.18),
      sx: 0.9,
      sy: 0.08,
      sz: 0.22,
      ry: stop.ry,
    });
  }

  // Señalización vertical en algunas esquinas
  const signSpots = [
    [STREET_XS[0] + walk, STREET_ZS[0] + walk * 0.4],
    [STREET_XS[2] - walk, STREET_ZS[2] - walk * 0.4],
    [STREET_XS[3] - walk, STREET_ZS[1] + walk],
    [ZONE_LAYOUT.transport.cx + 0.9, ZONE_LAYOUT.transport.cz - 0.4],
  ];
  for (const [x, z] of signSpots) {
    poles.push({ x, y: 0.55, z, sx: 0.05, sy: 1.0, sz: 0.05 });
    signs.push({ x: x + 0.08, y: 1.05, z, sx: 0.28, sy: 0.35, sz: 0.03 });
  }

  // Contenedores de reciclaje (máx. densidad; R4 ajusta count)
  const recycling = [];
  for (let i = 0; i < bins.length; i += 1) {
    const b = bins[i];
    recycling.push({
      x: b.x + 0.35,
      y: b.y,
      z: b.z + 0.15,
      sx: b.sx,
      sy: b.sy,
      sz: b.sz,
    });
  }
  // Puntos extra en residencial / comercial / industrial
  for (const lot of [ZONE_LAYOUT.residential, ZONE_LAYOUT.commercial, ZONE_LAYOUT.industrial]) {
    recycling.push(
      { x: lot.cx - 0.7, y: 0.22, z: lot.cz + lot.halfZ - 0.2, sx: 0.22, sy: 0.42, sz: 0.22 },
      { x: lot.cx - 0.4, y: 0.22, z: lot.cz + lot.halfZ - 0.2, sx: 0.22, sy: 0.42, sz: 0.22 }
    );
  }

  const recycleMat = mats.binBody.clone();
  recycleMat.color = new THREE.Color(0x2f6f4e);
  recycleMat.emissive = new THREE.Color(0x0a2a18);
  recycleMat.emissiveIntensity = 0.08;

  function tag(mesh, pool) {
    if (!mesh) return null;
    mesh.userData.visualPool = pool;
    return mesh;
  }

  const wasteMesh = tag(addInstanced(group, geos.bin, mats.binBody, bins, false), "waste");
  const recyclingMesh = tag(addInstanced(group, geos.bin, recycleMat, recycling, false), "recycling");

  addInstanced(group, geos.pole, mats.lampPost, poles, false);
  addInstanced(group, geos.box, mats.metalUrban, arms, false);
  addInstanced(group, geos.glow, mats.lampGlow, glows, false);
  addInstanced(group, geos.box, mats.woodBench, benches, false);
  addInstanced(group, geos.box, mats.metalUrban, benchLegs, false);
  addInstanced(group, geos.box, mats.metalUrban, signs, false);
  addInstanced(group, geos.box, mats.metalUrban, shelters, false);
  addInstanced(group, geos.pole, mats.metalUrban, shelterPosts, false);

  group.userData.visualPools = {
    waste: [wasteMesh].filter(Boolean),
    recycling: [recyclingMesh].filter(Boolean),
  };

  disposables.push(geos.box, geos.pole, geos.glow, geos.bin, recycleMat);
  return group;
}

function placeMesh(parent, geo, mat, x, y, z, sx, sy, sz, ry) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
