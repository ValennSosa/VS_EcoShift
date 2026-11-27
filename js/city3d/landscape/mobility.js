import * as THREE from "three";
import { ROAD_WIDTH, STREET_XS, STREET_ZS, ZONE_LAYOUT } from "../layout.js";
import { createRng, rngRange } from "../rng.js";
import { addInstanced } from "./instancing.js";

/**
 * Geometrías de movilidad urbana (procedurales, proporciones reales).
 */
export function createMobilityGeometries() {
  return {
    body: new THREE.BoxGeometry(1, 1, 1),
    cabin: new THREE.BoxGeometry(1, 1, 1),
    wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    bikeFrame: new THREE.BoxGeometry(1, 1, 1),
    bikeWheel: new THREE.TorusGeometry(0.5, 0.08, 6, 12),
    rack: new THREE.BoxGeometry(1, 1, 1),
    charger: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  };
}

function tag(mesh, pool) {
  if (!mesh) return null;
  mesh.userData.visualPool = pool;
  return mesh;
}

/**
 * @param {THREE.Group} parent
 * @param {{ mats: Record<string, THREE.Material> }} landscapeMats
 * @param {ReturnType<typeof createMobilityGeometries>} geos
 * @param {number} seed
 * @param {Array} disposables
 */
export function placeMobility(parent, landscapeMats, geos, seed, disposables) {
  const rng = createRng(seed ^ 0x20b1);
  const { mats } = landscapeMats;
  const group = new THREE.Group();
  group.name = "urban-mobility";
  parent.add(group);

  const bodies = [];
  const cabins = [];
  const bodyWheels = [];
  const evBodies = [];
  const evCabins = [];
  const evWheels = [];
  const accentBodies = [];
  const accentCabins = [];
  const accentWheels = [];
  const bikeFrames = [];
  const bikeWheels = [];
  const racks = [];
  const chargers = [];

  // Generar slots de flota (máx. densidad); R4 ajusta counts EV vs convencional
  const lanes = [
    {
      axis: "x",
      z: STREET_ZS[0] - ROAD_WIDTH * 0.28,
      ry: 0,
      start: STREET_XS[0] + 2.2,
      end: STREET_XS[3] - 2.2,
      step: 3.1,
    },
    {
      axis: "x",
      z: STREET_ZS[2] + ROAD_WIDTH * 0.28,
      ry: Math.PI,
      start: STREET_XS[0] + 2.8,
      end: STREET_XS[3] - 1.8,
      step: 3.2,
    },
    {
      axis: "z",
      x: STREET_XS[1] - ROAD_WIDTH * 0.28,
      ry: Math.PI / 2,
      start: STREET_ZS[0] + 2.4,
      end: STREET_ZS[3] - 2.2,
      step: 3.2,
    },
  ];

  /** @type {{x:number,z:number,ry:number}[]} */
  const slots = [];
  for (const lane of lanes) {
    for (let t = lane.start; t <= lane.end; t += lane.step) {
      if (rng() > 0.7) continue;
      const x = lane.axis === "x" ? t + rngRange(rng, -0.08, 0.08) : lane.x;
      const z = lane.axis === "z" ? t + rngRange(rng, -0.08, 0.08) : lane.z;
      if (lane.axis === "x" && STREET_XS.some((sx) => Math.abs(sx - x) < ROAD_WIDTH * 0.95)) continue;
      if (lane.axis === "z" && STREET_ZS.some((sz) => Math.abs(sz - z) < ROAD_WIDTH * 0.95)) continue;
      slots.push({ x, z, ry: lane.ry });
    }
  }

  // Duplicar cada slot como potencial convencional y EV (misma pose); R4 elige counts.
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    pushCar({ bodies, cabins, wheels: bodyWheels }, { ...slot, kind: "city" });
    pushCar({ bodies: evBodies, cabins: evCabins, wheels: evWheels }, { ...slot, kind: "ev" });
    if (i % 4 === 0) {
      pushCar(
        { bodies: accentBodies, cabins: accentCabins, wheels: accentWheels },
        { ...slot, kind: "accent" }
      );
    }
  }

  const avenueZ = STREET_ZS[STREET_ZS.length - 1];
  const L = ZONE_LAYOUT.transport;

  placeSimpleBox(group, geos.body, mats.concreteLite, L.cx, 0.04, avenueZ + 1.35, 5.2, 0.06, 0.55, 0);

  for (let i = 0; i < 8; i += 1) {
    const x = L.cx - 2.8 + i * 0.75;
    racks.push({ x, y: 0.22, z: avenueZ + 1.35, sx: 0.08, sy: 0.4, sz: 0.35 });
    bikeFrames.push({
      x: x + 0.12,
      y: 0.18,
      z: avenueZ + 1.35,
      sx: 0.42,
      sy: 0.12,
      sz: 0.08,
      ry: 0.15,
    });
    bikeWheels.push(
      { x: x - 0.05, y: 0.16, z: avenueZ + 1.35, sx: 0.28, sy: 0.28, sz: 0.28, ry: Math.PI / 2 },
      { x: x + 0.28, y: 0.16, z: avenueZ + 1.35, sx: 0.28, sy: 0.28, sz: 0.28, ry: Math.PI / 2 }
    );
  }

  for (let i = 0; i < 4; i += 1) {
    const x = L.cx - 1.5 + i * 1.0;
    const z = L.cz - 0.95;
    chargers.push({ x, y: 0.42, z, sx: 0.14, sy: 0.7, sz: 0.14 });
    placeSimpleBox(group, geos.body, mats.concreteLite, x, 0.06, z, 0.55, 0.05, 0.55, 0);
  }

  // EVs en carga (siempre en pool EV)
  pushCar(
    { bodies: evBodies, cabins: evCabins, wheels: evWheels },
    { x: L.cx - 1.1, z: L.cz - 0.55, ry: Math.PI, kind: "ev" }
  );
  pushCar(
    { bodies: evBodies, cabins: evCabins, wheels: evWheels },
    { x: L.cx + 1.1, z: L.cz - 0.55, ry: Math.PI, kind: "ev" }
  );

  const pools = {
    cars: [
      tag(addInstanced(group, geos.body, mats.vehicleBody, bodies, false), "cars"),
      tag(addInstanced(group, geos.cabin, mats.glassTint, cabins, false), "cars"),
      tag(addInstanced(group, geos.wheel, mats.rubber, bodyWheels, false), "cars"),
      tag(addInstanced(group, geos.body, mats.vehicleAccent, accentBodies, false), "cars"),
      tag(addInstanced(group, geos.cabin, mats.glassTint, accentCabins, false), "cars"),
      tag(addInstanced(group, geos.wheel, mats.rubber, accentWheels, false), "cars"),
    ].filter(Boolean),
    evs: [
      tag(addInstanced(group, geos.body, mats.vehicleEv, evBodies, false), "evs"),
      tag(addInstanced(group, geos.cabin, mats.glassTint, evCabins, false), "evs"),
      tag(addInstanced(group, geos.wheel, mats.rubber, evWheels, false), "evs"),
    ].filter(Boolean),
    bikes: [
      tag(addInstanced(group, geos.bikeFrame, mats.metalUrban, bikeFrames, false), "bikes"),
      tag(addInstanced(group, geos.bikeWheel, mats.rubber, bikeWheels, false), "bikes"),
      tag(addInstanced(group, geos.rack, mats.metalUrban, racks, false), "bikes"),
    ].filter(Boolean),
    chargers: [tag(addInstanced(group, geos.charger, mats.lampPost, chargers, false), "chargers")].filter(
      Boolean
    ),
  };

  group.userData.visualPools = pools;

  disposables.push(
    geos.body,
    geos.cabin,
    geos.wheel,
    geos.bikeFrame,
    geos.bikeWheel,
    geos.rack,
    geos.charger
  );

  return group;
}

function pushCar(buckets, cfg) {
  const { x, z, ry } = cfg;
  const length = 0.78;
  const width = 0.38;
  const height = 0.26;
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);

  buckets.bodies.push({ x, y: 0.2, z, sx: length, sy: height, sz: width, ry });
  buckets.cabins.push({
    x: x + cos * 0.05,
    y: 0.38,
    z: z + sin * 0.05,
    sx: length * 0.55,
    sy: 0.2,
    sz: width * 0.85,
    ry,
  });

  for (const [ox, oz] of [
    [0.26, 0.18],
    [0.26, -0.18],
    [-0.26, 0.18],
    [-0.26, -0.18],
  ]) {
    buckets.wheels.push({
      x: x + cos * ox - sin * oz,
      y: 0.1,
      z: z + sin * ox + cos * oz,
      sx: 0.12,
      sy: 0.08,
      sz: 0.12,
      ry,
      tilt: Math.PI / 2,
    });
  }
}

function placeSimpleBox(parent, geo, mat, x, y, z, sx, sy, sz, ry) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
