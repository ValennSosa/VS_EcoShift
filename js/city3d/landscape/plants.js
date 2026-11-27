import * as THREE from "three";
import {
  STREET_XS,
  STREET_ZS,
  ZONE_LAYOUT,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  computeBlocks,
} from "../layout.js";
import { createRng, rngRange } from "../rng.js";

/**
 * Coloca clones de plantas Poly Haven en canteros, veredas y terrazas.
 * Cantidad acotada: los GLTF no están instanciados.
 * @param {import("three").Group} parent
 * @param {Awaited<ReturnType<import("./plantKit.js").loadPlantKit>> | null} plantKit
 * @param {number} seed
 */
export function placeAccentPlants(parent, plantKit, seed) {
  if (!plantKit) return null;
  const rng = createRng(seed ^ 0x51a7);
  const group = new THREE.Group();
  group.name = "accent-plants";
  parent.add(group);

  const halfRoad = ROAD_WIDTH / 2;
  const curb = halfRoad + SIDEWALK_WIDTH * 0.72;

  // Solo algunas esquinas clave (no todas las intersecciones)
  const cornerPicks = [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 1],
    [1, 3],
    [0, 2],
  ];
  for (const [ix, iz] of cornerPicks) {
    const sx = STREET_XS[ix];
    const sz = STREET_ZS[iz];
    const kind = rng() > 0.45 ? "shrub" : "fern";
    placeClone(group, plantKit, kind, {
      x: sx + curb * 0.92,
      z: sz + curb * 0.92,
      scale: rngRange(rng, 0.75, 1.0),
      ry: rngRange(rng, 0, Math.PI * 2),
    });
  }

  // Arbustos en borde del parque (pocos)
  const park = ZONE_LAYOUT.green;
  for (let i = 0; i < 6; i += 1) {
    const ang = (i / 6) * Math.PI * 2 + 0.2;
    const rad = Math.min(park.halfX, park.halfZ) * 0.82;
    placeClone(group, plantKit, i % 2 === 0 ? "fern" : "shrub", {
      x: park.cx + Math.cos(ang) * rad,
      z: park.cz + Math.sin(ang) * rad,
      scale: rngRange(rng, 0.8, 1.05),
      ry: ang,
    });
  }

  // Macetas en accesos (máx. 6)
  const potLots = [
    { lot: ZONE_LAYOUT.residential, n: 2 },
    { lot: ZONE_LAYOUT.commercial, n: 2 },
    { lot: ZONE_LAYOUT.transport, n: 2 },
  ];
  for (const { lot, n } of potLots) {
    for (let i = 0; i < n; i += 1) {
      placeClone(group, plantKit, "pot", {
        x: lot.cx - lot.halfX * 0.4 + i * 0.55,
        z: lot.cz + lot.halfZ - 0.22,
        scale: rngRange(rng, 0.7, 0.9),
        ry: rngRange(rng, 0, Math.PI),
      });
    }
  }

  // Cubiertas verdes R2
  const blocks = Object.fromEntries(computeBlocks().map((b) => [b.id, b]));
  const greenRoofSpots = [
    {
      x: ZONE_LAYOUT.residential.cx + 0.55,
      z: ZONE_LAYOUT.residential.cz + 0.4,
      y: 3.15,
    },
    {
      x: (blocks["block-0-2"]?.cx || -7.5) + 0.45,
      z: (blocks["block-0-2"]?.cz || 7.5) + 0.4,
      y: 3.05,
    },
  ];
  for (const spot of greenRoofSpots) {
    placeClone(group, plantKit, "fern", {
      x: spot.x,
      y: spot.y,
      z: spot.z,
      scale: 0.5,
      ry: rngRange(rng, 0, Math.PI),
    });
  }

  return group;
}

function placeClone(parent, plantKit, id, cfg) {
  const clone = plantKit.clone(id);
  clone.position.set(cfg.x, cfg.y ?? 0, cfg.z);
  clone.rotation.y = cfg.ry || 0;
  clone.scale.multiplyScalar(cfg.scale ?? 1);
  clone.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = true;
    }
  });
  parent.add(clone);
  return clone;
}
