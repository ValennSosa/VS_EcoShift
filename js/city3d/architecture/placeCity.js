import { ZONE_LAYOUT, computeBlocks } from "../layout.js";
import { CITY_PLACEMENTS, TYPOLOGIES } from "./constants.js";
import { buildBuildingLodSet, createBuildingLod } from "./lod.js";
import { assembleBuilding } from "./assemble.js";
import { mergeBuildingMeshes } from "./mergeBuilding.js";

/**
 * Coloca tipologías ensambladas sobre lotes de la trama R1.
 * @param {{
 *   zones: Record<string, { group: import("three").Group }>,
 *   root: import("three").Group,
 *   kit: object,
 *   mats?: Record<string, import("three").Material>,
 *   quality?: import("../quality/profile.js").QualityProfile | null,
 * }} ctx
 */
export function placeArchitecture(ctx) {
  const { zones, root, kit, mats } = ctx;
  const quality = ctx.quality || null;
  const merge = quality?.mergeBuildings !== false;
  const useLod = quality?.buildingLod !== false;
  const lodNear = quality?.lodNear ?? 14;
  const lodFar = quality?.lodFar ?? 26;

  const blocks = Object.fromEntries(computeBlocks().map((b) => [b.id, b]));
  /** @type {import("three").Object3D[]} */
  const buildings = [];
  /** @type {Map<string, object>} */
  const templateCache = new Map();

  function getBuilding(typologyId) {
    if (templateCache.has(typologyId)) {
      const cached = templateCache.get(typologyId);
      if (cached.lod) {
        // Clonar niveles LOD
        return createBuildingLod(
          {
            high: cached.high.clone(true),
            mid: cached.mid.clone(true),
            low: cached.low.clone(true),
          },
          { near: lodNear, far: lodFar }
        );
      }
      return cached.high.clone(true);
    }

    if (useLod) {
      const set = buildBuildingLodSet(kit, typologyId, {
        mats,
        merge,
        castShadow: quality?.shadows !== false,
      });
      templateCache.set(typologyId, { lod: true, ...set });
      return createBuildingLod(
        {
          high: set.high.clone(true),
          mid: set.mid.clone(true),
          low: set.low.clone(true),
        },
        { near: lodNear, far: lodFar }
      );
    }

    const built = assembleBuilding(kit, typologyId, { mats, detail: "high" });
    if (merge) mergeBuildingMeshes(built);
    templateCache.set(typologyId, { lod: false, high: built });
    return built.clone(true);
  }

  for (const placement of CITY_PLACEMENTS) {
    const typology = TYPOLOGIES[placement.typology];
    if (!typology) continue;

    let cx;
    let cz;
    let parent = root;
    let zoneId = placement.zoneId || null;

    if (placement.zoneId && ZONE_LAYOUT[placement.zoneId]) {
      const lot = ZONE_LAYOUT[placement.zoneId];
      cx = lot.cx + placement.x;
      cz = lot.cz + placement.z;
      parent = zones[placement.zoneId]?.group || root;
      zoneId = placement.zoneId;
    } else if (placement.blockId && blocks[placement.blockId]) {
      const block = blocks[placement.blockId];
      cx = block.cx + placement.x;
      cz = block.cz + placement.z;
      parent = root;
    } else {
      continue;
    }

    const building = getBuilding(placement.typology);
    building.position.set(cx, 0, cz);
    building.rotation.y = placement.ry || 0;
    building.userData.zoneId = zoneId;
    building.userData.blockId = placement.blockId || ZONE_LAYOUT[zoneId]?.blockId || null;
    parent.add(building);
    buildings.push(building);
  }

  return {
    buildings,
    typologiesUsed: [...new Set(CITY_PLACEMENTS.map((p) => p.typology))],
    disposeTemplates() {
      templateCache.clear();
    },
  };
}
