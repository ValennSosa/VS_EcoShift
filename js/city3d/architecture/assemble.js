import * as THREE from "three";
import { BAY, FLOOR_HEIGHT, FLOOR_PITCH, BASE_OFFSET_Y, TYPOLOGIES } from "./constants.js";
import { MODULE_RECIPES } from "./facadeKit.js";

/**
 * Ensambla un edificio completo: masa + 4 fachadas del kit + cubierta EcoShift.
 * @param {Awaited<ReturnType<import("./facadeKit.js").loadFacadeKit>>} kit
 * @param {string | object} typologyOrId
 * @param {{ mats?: Record<string, THREE.Material>, detail?: 'high'|'mid'|'low' }} [options]
 * @returns {THREE.Group}
 */
export function assembleBuilding(kit, typologyOrId, options = {}) {
  const typology =
    typeof typologyOrId === "string" ? TYPOLOGIES[typologyOrId] : typologyOrId;
  if (!typology) throw new Error(`Tipología desconocida: ${typologyOrId}`);

  const mats = options.mats || {};
  const detail = options.detail || "high";
  const baysX = typology.baysX;
  const baysZ = typology.baysZ;
  const floors = typology.floors;
  const scaleXZ = typology.cityScale ?? 0.85;
  const scaleY = typology.cityScaleY ?? scaleXZ * 0.38;

  const width = baysX * BAY;
  const depth = baysZ * BAY;
  const wallTop = floors * FLOOR_PITCH;
  const coreHeight = wallTop - BASE_OFFSET_Y;

  const root = new THREE.Group();
  root.name = `building-${typology.id}`;
  root.userData.typologyId = typology.id;
  root.userData.category = typology.category;

  const coreMat =
    mats.core ||
    new THREE.MeshStandardMaterial({
      color: 0xd5dbd4,
      roughness: 0.93,
      metalness: 0.02,
    });
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.12, coreHeight - 0.2, depth - 0.12),
    coreMat
  );
  core.position.y = BASE_OFFSET_Y + coreHeight / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  root.add(core);

  // Frente (+Z)
  const front = buildFacadeStrip(kit, typology, baysX, true, detail);
  front.position.set(-width / 2, 0, depth / 2);
  root.add(front);

  // Trasera (-Z)
  const back = buildFacadeStrip(kit, typology, baysX, false, detail);
  back.rotation.y = Math.PI;
  back.position.set(width / 2, 0, -depth / 2);
  root.add(back);

  // Derecha (+X)
  const right = buildFacadeStrip(kit, typology, baysZ, false, detail);
  right.rotation.y = Math.PI / 2;
  right.position.set(width / 2, 0, depth / 2);
  root.add(right);

  // Izquierda (-X)
  const left = buildFacadeStrip(kit, typology, baysZ, false, detail);
  left.rotation.y = -Math.PI / 2;
  left.position.set(-width / 2, 0, -depth / 2);
  root.add(left);

  addRoof(root, typology, width, depth, wallTop, mats, detail);

  root.scale.set(scaleXZ, scaleY, scaleXZ);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (!box.isEmpty()) root.position.y -= box.min.y;

  return root;
}

/**
 * Franja de fachada a lo largo de +X local (bahías 0..n-1).
 * Cada muro del kit ocupa X local [-3,0] → se ancla en x=(bay+1)*BAY.
 */
function buildFacadeStrip(kit, typology, bays, isFront, detail = "high") {
  const strip = new THREE.Group();
  strip.name = isFront ? "facade-front" : "facade-side";

  for (let bay = 0; bay < bays; bay += 1) {
    const x = (bay + 1) * BAY;
    placeBayStack(kit, strip, {
      x,
      floors: typology.floors,
      isFront,
      bayIndex: bay,
      typology,
      detail,
    });
  }
  return strip;
}

function placeBayStack(kit, parent, { x, floors, isFront, bayIndex, typology, detail = "high" }) {
  const high = detail === "high";
  const mid = detail === "mid";
  const low = detail === "low";

  safeAdd(kit, parent, MODULE_RECIPES.trim.base, x, BASE_OFFSET_Y, 0);
  if (high) safeAdd(kit, parent, MODULE_RECIPES.trim.dado, x, -1, 0);

  for (let floor = 0; floor < floors; floor += 1) {
    const y = floor * FLOOR_PITCH;
    // low: muros plain en laterales; frente conserva vanos
    let wallName = resolveWallName(typology, isFront, bayIndex, floor);
    if (low && !isFront) wallName = MODULE_RECIPES.wall.plain;
    safeAdd(kit, parent, wallName, x, y, 0);

    if (floor === 0 && isFront && bayIndex === 0 && !low) {
      const door =
        typology.front === "door-large"
          ? MODULE_RECIPES.door.large
          : MODULE_RECIPES.door.small;
      safeAdd(kit, parent, door, x, y, 0);
    } else if (high && wallName.includes("window")) {
      safeAdd(kit, parent, pickWindowVariant(kit, typology, floor), x, y, 0);
    }

    if (high && floor < floors - 1) {
      safeAdd(kit, parent, MODULE_RECIPES.trim.cornice, x, y + FLOOR_HEIGHT + 0.4, 0);
    }
  }

  const crownY = floors * FLOOR_PITCH;
  safeAdd(kit, parent, MODULE_RECIPES.trim.crown, x, crownY, 0);
}

function resolveWallName(typology, isFront, bayIndex, floor) {
  const R = MODULE_RECIPES.wall;
  if (floor === 0 && isFront && bayIndex === 0) {
    return typology.front === "door-large" ? R.doorLarge : R.doorSmall;
  }
  switch (typology.window) {
    case "double":
      return R.winDouble;
    case "large":
      return R.winLarge;
    case "offset":
      return R.winOffset;
    default:
      return R.winSmall;
  }
}

function pickWindowVariant(kit, typology, floor) {
  const R = MODULE_RECIPES.window;
  let base = R.small;
  switch (typology.window) {
    case "double":
      base = R.double;
      break;
    case "large":
      base = R.large;
      break;
    case "offset":
      base = R.offset;
      break;
    default:
      break;
  }
  const suffix = `_0${(floor % 3) + 1}`;
  const candidate = base.replace("_01", suffix);
  if (kit.has(candidate)) return candidate;
  if (kit.has(base.replace("_01", "_02"))) return base.replace("_01", "_02");
  return base;
}

function safeAdd(kit, parent, name, x, y, z) {
  if (!name || !kit.has(name)) return null;
  const mod = kit.cloneModule(name);
  mod.position.set(x, y, z);
  parent.add(mod);
  return mod;
}

function addRoof(root, typology, width, depth, wallTop, mats, detail = "high") {
  const roofY = wallTop + 0.12;
  const roofMat =
    mats.roof ||
    new THREE.MeshStandardMaterial({
      color: 0x4a4540,
      roughness: 0.88,
      metalness: 0.08,
    });
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.2, 0.16, depth + 0.2),
    roofMat
  );
  deck.position.y = roofY;
  deck.castShadow = true;
  deck.receiveShadow = true;
  root.add(deck);

  if (typology.roof === "green") {
    const green =
      mats.park ||
      new THREE.MeshStandardMaterial({
        color: 0x2fbf71,
        roughness: 0.95,
        metalness: 0.02,
      });
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.84, 0.07, depth * 0.84),
      green
    );
    pad.position.y = roofY + 0.12;
    pad.receiveShadow = true;
    pad.userData.visualLayer = "greenRoof";
    root.add(pad);
    const foliage =
      mats.foliage ||
      new THREE.MeshStandardMaterial({ color: 0x0e7a58, roughness: 0.9 });
    const bushCount = detail === "low" ? 2 : detail === "mid" ? 3 : 5;
    for (let i = 0; i < bushCount; i += 1) {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), foliage);
      bush.position.set(
        ((i % 3) - 1) * width * 0.2,
        roofY + 0.32,
        (Math.floor(i / 3) - 0.25) * depth * 0.22
      );
      bush.scale.set(1 + (i % 2) * 0.2, 0.75 + (i % 3) * 0.08, 1 + ((i + 1) % 2) * 0.15);
      bush.castShadow = detail === "high";
      bush.userData.visualLayer = "greenRoof";
      root.add(bush);
    }
  }

  if (typology.roof === "solar" || typology.roof === "hvac") {
    const solar =
      mats.solar ||
      new THREE.MeshStandardMaterial({
        color: 0x1b3a5a,
        roughness: 0.35,
        metalness: 0.55,
        emissive: 0x0a2030,
        emissiveIntensity: 0.2,
      });
    const frame =
      mats.metal ||
      new THREE.MeshStandardMaterial({
        color: 0x9aa39c,
        roughness: 0.45,
        metalness: 0.6,
      });
    const cols = detail === "low" ? 1 : typology.roof === "solar" ? 3 : 2;
    const rows = detail === "low" ? 1 : typology.roof === "solar" ? 2 : 1;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.2, 0.035, depth * 0.26),
          solar
        );
        panel.position.set(
          (c - (cols - 1) / 2) * width * 0.26,
          roofY + 0.2,
          (r - (rows - 1) / 2) * depth * 0.3
        );
        panel.rotation.x = -0.32;
        panel.castShadow = true;
        panel.userData.visualLayer = "solar";
        root.add(panel);
      }
    }
    if (typology.roof === "hvac") {
      const unit = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.26, 0.32, depth * 0.26),
        frame
      );
      unit.position.set(width * 0.16, roofY + 0.32, -depth * 0.08);
      unit.castShadow = true;
      unit.userData.visualLayer = "efficiency";
      root.add(unit);
    }
  }
}
