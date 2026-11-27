import * as THREE from "three";
import { ZONE_DEFINITIONS } from "../sim/zones.js";
import { CITY_SEED, PLATFORM_SIZE, ROAD_SEGMENTS, ZONE_LAYOUT, getCityLayout } from "./layout.js";
import { createCityMaterials } from "./materials.js";
import { createRng, rngRange } from "./rng.js";

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Ciudad 3D procedural determinista (Etapa 2).
 * Visuales estáticos; applyVisualState queda listo para Etapa 3.
 */
export function buildProceduralCity(scene) {
  const rng = createRng(CITY_SEED);
  const materialKit = createCityMaterials();
  const { mats } = materialKit;

  const geos = createSharedGeometries();
  const disposables = [...Object.values(geos), materialKit];

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

  // Suelo base
  const ground = new THREE.Mesh(geos.platform, mats.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  buildRoads(root, geos, mats, disposables);
  buildGreen(zones.green, geos, mats, rng, disposables);
  buildResidential(zones.residential, geos, mats, rng, disposables);
  buildCommercial(zones.commercial, geos, mats, rng, disposables);
  buildIndustrial(zones.industrial, geos, mats, rng, disposables);
  buildTransport(zones.transport, geos, mats, rng, disposables);
  buildEnergy(zones.energy, geos, mats, rng, disposables);
  buildStreetFurniture(root, geos, mats, rng, disposables);

  return {
    root,
    zones,
    layout: getCityLayout(),
    disposables,
    applyVisualState() {
      // Etapa 3: mapear calculateZoneStates → densidades / paneles / flota.
    },
  };
}

function createSharedGeometries() {
  return {
    platform: new THREE.PlaneGeometry(PLATFORM_SIZE, PLATFORM_SIZE),
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
    sphere: new THREE.SphereGeometry(0.5, 8, 6),
    thinBox: new THREE.BoxGeometry(1, 1, 1),
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

function buildRoads(root, geos, mats) {
  const roadGroup = new THREE.Group();
  roadGroup.name = "roads";
  root.add(roadGroup);

  for (const segment of ROAD_SEGMENTS) {
    placeBox(roadGroup, geos.box, mats.asphalt, segment.x, 0.04, segment.z, segment.w, 0.08, segment.d, segment.ry, false);
    // veredas laterales
    if (segment.w > segment.d) {
      placeBox(roadGroup, geos.box, mats.sidewalk, segment.x, 0.06, segment.z - segment.d / 2 - 0.35, segment.w, 0.06, 0.55, 0, false);
      placeBox(roadGroup, geos.box, mats.sidewalk, segment.x, 0.06, segment.z + segment.d / 2 + 0.35, segment.w, 0.06, 0.55, 0, false);
    } else {
      placeBox(roadGroup, geos.box, mats.sidewalk, segment.x - segment.w / 2 - 0.35, 0.06, segment.z, 0.55, 0.06, segment.d, 0, false);
      placeBox(roadGroup, geos.box, mats.sidewalk, segment.x + segment.w / 2 + 0.35, 0.06, segment.z, 0.55, 0.06, segment.d, 0, false);
    }
  }

  // marcas de carril en avenida sur
  const marks = [];
  for (let i = -9; i <= 9; i += 1.4) {
    marks.push({ x: i, y: 0.09, z: 8.2, sx: 0.55, sy: 0.02, sz: 0.12 });
  }
  addInstanced(roadGroup, geos.box, mats.marker, marks, null, false);
}

function buildGreen(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.green;
  placeBox(group, geos.box, mats.park, L.cx, 0.05, L.cz, L.halfX * 2, 0.1, L.halfZ * 2, 0, false);

  // lago
  placeBox(group, geos.box, mats.water, L.cx + 0.8, 0.08, L.cz + 0.4, 2.2, 0.08, 1.4, 0.2, false);

  // senderos
  placeBox(group, geos.box, mats.path, L.cx, 0.09, L.cz - 0.2, 0.55, 0.04, L.halfZ * 1.6, 0, false);
  placeBox(group, geos.box, mats.path, L.cx + 0.2, 0.09, L.cz + 1.2, L.halfX * 1.4, 0.04, 0.5, 0, false);

  // banco / plaza
  placeBox(group, geos.box, mats.sidewalk, L.cx - 1.8, 0.12, L.cz - 1.6, 1.6, 0.12, 1.2, 0, false);
  placeBox(group, geos.box, mats.facadeDark, L.cx - 1.8, 0.35, L.cz - 1.2, 1.2, 0.18, 0.28, 0, true);

  const trunks = [];
  const foliage = [];
  const foliageLite = [];
  for (let i = 0; i < 28; i += 1) {
    const x = L.cx + rngRange(rng, -L.halfX + 0.5, L.halfX - 0.5);
    const z = L.cz + rngRange(rng, -L.halfZ + 0.5, L.halfZ - 0.5);
    // evitar el lago
    if (Math.hypot(x - (L.cx + 0.8), z - (L.cz + 0.4)) < 1.4) continue;
    const h = rngRange(rng, 0.9, 1.8);
    trunks.push({ x, y: h * 0.35, z, sx: 0.18, sy: h * 0.7, sz: 0.18 });
    const canopy = { x, y: h * 0.85, z, sx: rngRange(rng, 0.7, 1.2), sy: rngRange(rng, 0.7, 1.15), sz: rngRange(rng, 0.7, 1.2) };
    if (rng() > 0.55) foliageLite.push(canopy);
    else foliage.push(canopy);
  }
  zone.meshes.push(
    addInstanced(group, geos.cylinder, mats.trunk, trunks, disposables),
    addInstanced(group, geos.sphere, mats.foliage, foliage, disposables),
    addInstanced(group, geos.sphere, mats.foliageLight, foliageLite, disposables)
  );
}

function buildResidential(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.residential;
  placeBox(group, geos.box, mats.sidewalk, L.cx, 0.05, L.cz, L.halfX * 2, 0.08, L.halfZ * 2, 0, false);

  const houses = [
    { x: -1.6, z: -1.4, w: 1.5, d: 1.3, h: 1.2, roof: 0.45 },
    { x: 0.3, z: -1.5, w: 1.3, d: 1.2, h: 1.5, roof: 0.5 },
    { x: 1.8, z: -0.9, w: 1.4, d: 1.4, h: 1.1, roof: 0.4 },
    { x: -1.5, z: 0.7, w: 1.6, d: 1.4, h: 1.8, roof: 0.35 },
    { x: 0.5, z: 1.0, w: 1.7, d: 1.5, h: 2.2, roof: 0.3 },
    { x: 1.9, z: 1.3, w: 1.3, d: 1.2, h: 1.4, roof: 0.45 },
  ];

  const windows = [];
  const panels = [];
  const bins = [];

  for (const house of houses) {
    const hx = L.cx + house.x;
    const hz = L.cz + house.z;
    const facade = rng() > 0.5 ? mats.facadeWarm : mats.facadeCool;
    placeBox(group, geos.box, facade, hx, house.h / 2, hz, house.w, house.h, house.d);
    placeBox(group, geos.box, mats.roofTile, hx, house.h + house.roof / 2, hz, house.w * 1.08, house.roof, house.d * 1.08);
    // puerta
    placeBox(group, geos.box, mats.facadeDark, hx, 0.35, hz + house.d / 2 + 0.01, 0.28, 0.7, 0.06, 0, false);
    // ventanas
    windows.push(
      { x: hx - house.w * 0.25, y: house.h * 0.55, z: hz + house.d / 2 + 0.02, sx: 0.28, sy: 0.28, sz: 0.05 },
      { x: hx + house.w * 0.22, y: house.h * 0.55, z: hz + house.d / 2 + 0.02, sx: 0.28, sy: 0.28, sz: 0.05 }
    );
    if (house.h > 1.5) {
      windows.push(
        { x: hx - house.w * 0.2, y: house.h * 0.78, z: hz + house.d / 2 + 0.02, sx: 0.24, sy: 0.24, sz: 0.05 },
        { x: hx + house.w * 0.2, y: house.h * 0.78, z: hz + house.d / 2 + 0.02, sx: 0.24, sy: 0.24, sz: 0.05 }
      );
    }
    // paneles solares en algunos techos
    if (rng() > 0.35) {
      panels.push({
        x: hx,
        y: house.h + house.roof + 0.06,
        z: hz - house.d * 0.1,
        sx: house.w * 0.55,
        sy: 0.05,
        sz: house.d * 0.4,
        ry: 0.15,
      });
    }
    bins.push({ x: hx + house.w * 0.55, y: 0.2, z: hz + house.d * 0.35, sx: 0.22, sy: 0.35, sz: 0.22 });
  }

  // árboles de barrio
  const trunks = [];
  const leaves = [];
  for (let i = 0; i < 10; i += 1) {
    const x = L.cx + rngRange(rng, -L.halfX + 0.4, L.halfX - 0.4);
    const z = L.cz + rngRange(rng, -L.halfZ + 0.4, L.halfZ - 0.4);
    trunks.push({ x, y: 0.45, z, sx: 0.14, sy: 0.9, sz: 0.14 });
    leaves.push({ x, y: 1.15, z, sx: 0.7, sy: 0.7, sz: 0.7 });
  }

  zone.meshes.push(
    addInstanced(group, geos.box, mats.glass, windows, disposables, false),
    addInstanced(group, geos.box, mats.solar, panels, disposables, false),
    addInstanced(group, geos.box, mats.facadeAccent, bins, disposables),
    addInstanced(group, geos.cylinder, mats.trunk, trunks, disposables),
    addInstanced(group, geos.sphere, mats.foliage, leaves, disposables)
  );
}

function buildCommercial(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.commercial;
  placeBox(group, geos.box, mats.sidewalk, L.cx, 0.05, L.cz, L.halfX * 2, 0.08, L.halfZ * 2, 0, false);
  placeBox(group, geos.box, mats.parking, L.cx + 2.2, 0.07, L.cz + 1.8, 2.4, 0.06, 2.0, 0, false);

  const towers = [
    { x: -1.4, z: -0.8, w: 1.8, d: 1.6, h: 4.2 },
    { x: 0.8, z: -1.2, w: 1.5, d: 1.5, h: 3.4 },
    { x: -0.4, z: 1.2, w: 2.0, d: 1.7, h: 2.6 },
    { x: 1.6, z: 0.6, w: 1.4, d: 1.3, h: 5.0 },
  ];

  const windows = [];
  for (const tower of towers) {
    const tx = L.cx + tower.x;
    const tz = L.cz + tower.z;
    placeBox(group, geos.box, mats.facadeCool, tx, tower.h / 2, tz, tower.w, tower.h, tower.d);
    placeBox(group, geos.box, mats.roof, tx, tower.h + 0.12, tz, tower.w * 1.02, 0.24, tower.d * 1.02);
    // antena / HVAC
    placeBox(group, geos.box, mats.metal, tx + tower.w * 0.2, tower.h + 0.45, tz, 0.35, 0.5, 0.35);

    const floors = Math.max(3, Math.floor(tower.h / 0.55));
    for (let f = 1; f < floors; f += 1) {
      const y = f * (tower.h / floors);
      windows.push(
        { x: tx - tower.w * 0.28, y, z: tz + tower.d / 2 + 0.02, sx: 0.22, sy: 0.22, sz: 0.04 },
        { x: tx, y, z: tz + tower.d / 2 + 0.02, sx: 0.22, sy: 0.22, sz: 0.04 },
        { x: tx + tower.w * 0.28, y, z: tz + tower.d / 2 + 0.02, sx: 0.22, sy: 0.22, sz: 0.04 }
      );
    }
  }

  // farolas comerciales
  const poles = [];
  const glows = [];
  for (let i = 0; i < 6; i += 1) {
    const x = L.cx + rngRange(rng, -L.halfX + 0.5, L.halfX - 0.5);
    const z = L.cz + L.halfZ - 0.35;
    poles.push({ x, y: 0.7, z, sx: 0.08, sy: 1.4, sz: 0.08 });
    glows.push({ x, y: 1.45, z, sx: 0.22, sy: 0.18, sz: 0.22 });
  }

  zone.meshes.push(
    addInstanced(group, geos.box, mats.windowLit, windows, disposables, false),
    addInstanced(group, geos.cylinder, mats.lamp, poles, disposables),
    addInstanced(group, geos.sphere, mats.lampGlow, glows, disposables, false)
  );
}

function buildIndustrial(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.industrial;
  placeBox(group, geos.box, mats.curb, L.cx, 0.05, L.cz, L.halfX * 2, 0.08, L.halfZ * 2, 0, false);

  // naves
  placeBox(group, geos.box, mats.facadeDark, L.cx - 1.2, 1.0, L.cz - 0.4, 3.2, 2.0, 2.4);
  placeBox(group, geos.box, mats.metal, L.cx - 1.2, 2.15, L.cz - 0.4, 3.4, 0.3, 2.6);
  placeBox(group, geos.box, mats.facadeAccent, L.cx + 1.8, 0.85, L.cz + 0.8, 2.4, 1.7, 2.0);
  placeBox(group, geos.box, mats.roof, L.cx + 1.8, 1.8, L.cz + 0.8, 2.55, 0.25, 2.15);

  // chimeneas
  placeBox(group, geos.cylinder, mats.chimney, L.cx - 2.2, 2.8, L.cz - 1.1, 0.45, 2.4, 0.45);
  placeBox(group, geos.cylinder, mats.chimney, L.cx - 0.4, 2.5, L.cz - 1.3, 0.38, 1.9, 0.38);

  // tanques / silos
  placeBox(group, geos.cylinder, mats.metal, L.cx + 2.6, 1.1, L.cz - 1.5, 1.0, 2.0, 1.0);
  placeBox(group, geos.cylinder, mats.metal, L.cx + 1.3, 0.9, L.cz - 1.8, 0.85, 1.6, 0.85);

  // paneles en nave
  const panels = [];
  for (let i = 0; i < 5; i += 1) {
    panels.push({
      x: L.cx - 2.2 + i * 0.55,
      y: 2.4,
      z: L.cz - 0.4,
      sx: 0.45,
      sy: 0.05,
      sz: 1.4,
      ry: 0.12,
    });
  }
  // contenedores de residuos
  const waste = [];
  for (let i = 0; i < 4; i += 1) {
    waste.push({
      x: L.cx + rngRange(rng, -0.5, 2.8),
      y: 0.35,
      z: L.cz + 2.2,
      sx: 0.7,
      sy: 0.7,
      sz: 0.5,
      ry: rngRange(rng, -0.2, 0.2),
    });
  }

  zone.meshes.push(
    addInstanced(group, geos.box, mats.solar, panels, disposables, false),
    addInstanced(group, geos.box, mats.facadeAccent, waste, disposables)
  );
}

function buildTransport(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.transport;

  // ciclovía
  placeBox(group, geos.box, mats.park, L.cx, 0.1, L.cz + 0.95, 18, 0.05, 0.55, 0, false);

  const cars = [];
  const evs = [];
  const bikes = [];
  const chargers = [];

  for (let i = 0; i < 8; i += 1) {
    const x = -8.5 + i * 2.35 + rngRange(rng, -0.15, 0.15);
    const z = L.cz + (i % 2 === 0 ? -0.25 : 0.25);
    const body = { x, y: 0.28, z, sx: 0.9, sy: 0.35, sz: 0.45, ry: i % 2 === 0 ? 0 : Math.PI };
    if (i % 3 === 0) evs.push(body);
    else cars.push(body);
  }

  for (let i = 0; i < 10; i += 1) {
    bikes.push({
      x: -7 + i * 1.6,
      y: 0.18,
      z: L.cz + 0.95,
      sx: 0.35,
      sy: 0.2,
      sz: 0.12,
      ry: 0.1,
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const x = -6 + i * 4;
    chargers.push({ x, y: 0.55, z: L.cz - 1.05, sx: 0.18, sy: 1.0, sz: 0.18 });
    placeBox(group, geos.box, mats.solarFrame, x, 0.15, L.cz - 1.05, 0.7, 0.12, 0.7, 0, false);
  }

  zone.meshes.push(
    addInstanced(group, geos.box, mats.vehicle, cars, disposables),
    addInstanced(group, geos.box, mats.vehicleEv, evs, disposables),
    addInstanced(group, geos.box, mats.bike, bikes, disposables),
    addInstanced(group, geos.cylinder, mats.lamp, chargers, disposables)
  );
}

function buildEnergy(zone, geos, mats, rng, disposables) {
  const { group } = zone;
  const L = ZONE_LAYOUT.energy;
  placeBox(group, geos.box, mats.curb, L.cx, 0.05, L.cz, L.halfX * 2, 0.08, L.halfZ * 2, 0, false);

  // campo solar
  const panels = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      panels.push({
        x: L.cx - 2.2 + col * 0.95,
        y: 0.55,
        z: L.cz - 1.6 + row * 0.85,
        sx: 0.8,
        sy: 0.06,
        sz: 0.55,
        ry: 0.35,
      });
      placeBox(
        group,
        geos.box,
        mats.metal,
        L.cx - 2.2 + col * 0.95,
        0.25,
        L.cz - 1.6 + row * 0.85,
        0.08,
        0.45,
        0.08,
        0,
        false
      );
    }
  }

  // subestación / edificio técnico
  placeBox(group, geos.box, mats.facadeDark, L.cx + 1.8, 0.7, L.cz + 1.5, 2.2, 1.4, 1.8);
  placeBox(group, geos.box, mats.solarFrame, L.cx + 1.8, 1.5, L.cz + 1.5, 2.3, 0.2, 1.9);
  placeBox(group, geos.cylinder, mats.metal, L.cx + 0.4, 1.2, L.cz + 1.8, 0.7, 2.0, 0.7);

  // nodos de red
  const nodes = [];
  for (let i = 0; i < 6; i += 1) {
    nodes.push({
      x: L.cx + rngRange(rng, -3, 3),
      y: 0.35,
      z: L.cz + 2.4,
      sx: 0.25,
      sy: 0.5,
      sz: 0.25,
    });
  }

  zone.meshes.push(
    addInstanced(group, geos.box, mats.solar, panels, disposables, false),
    addInstanced(group, geos.box, mats.lampGlow, nodes, disposables, false)
  );
}

function buildStreetFurniture(root, geos, mats, rng, disposables) {
  const poles = [];
  const glows = [];
  const positions = [
    [-4.2, 4.5],
    [4.2, 4.5],
    [-4.2, -4.8],
    [4.2, -4.8],
    [-8.5, 0.5],
    [8.5, 0.2],
    [0, -7.5],
    [0, 6.5],
  ];
  for (const [x, z] of positions) {
    const jx = x + rngRange(rng, -0.1, 0.1);
    const jz = z + rngRange(rng, -0.1, 0.1);
    poles.push({ x: jx, y: 0.75, z: jz, sx: 0.08, sy: 1.5, sz: 0.08 });
    glows.push({ x: jx, y: 1.55, z: jz, sx: 0.2, sy: 0.16, sz: 0.2 });
  }
  addInstanced(root, geos.cylinder, mats.lamp, poles, disposables);
  addInstanced(root, geos.sphere, mats.lampGlow, glows, disposables, false);
}
