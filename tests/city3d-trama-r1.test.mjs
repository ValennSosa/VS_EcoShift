/**
 * R1 — trama urbana (layout, texturas, módulos, export).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { ZONE_DEFINITIONS } from "../js/sim/zones.js";
import {
  CITY_SEED,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  STREET_XS,
  STREET_ZS,
  ZONE_LAYOUT,
  computeBlocks,
  getCityLayout,
} from "../js/city3d/layout.js";

const ROOT = join(import.meta.dirname, "..");

const TEXTURE_COLORS = [
  "assets/city3d/textures/asphalt/Asphalt033_1K-JPG_Color.jpg",
  "assets/city3d/textures/sidewalk/PavingStones055_1K-JPG_Color.jpg",
  "assets/city3d/textures/grass/Grass001_1K-JPG_Color.jpg",
  "assets/city3d/textures/lot/Concrete034_1K-JPG_Color.jpg",
];

test("el grid urbano produce 9 manzanas y cubre las 6 zonas", () => {
  const blocks = computeBlocks();
  assert.equal(blocks.length, 9);
  assert.equal(STREET_XS.length, 4);
  assert.equal(STREET_ZS.length, 4);
  assert.ok(ROAD_WIDTH > 1.5);
  assert.ok(SIDEWALK_WIDTH > 0.4);

  const layout = getCityLayout();
  assert.equal(layout.seed, CITY_SEED);
  assert.equal(layout.blocks.length, 9);
  assert.ok(layout.preparedLots.length === 9);
  for (const zone of ZONE_DEFINITIONS) {
    assert.ok(layout.zones[zone.id], `falta zona ${zone.id}`);
    assert.equal(ZONE_LAYOUT[zone.id].id, zone.id);
    assert.ok(Number.isFinite(ZONE_LAYOUT[zone.id].cx));
    assert.ok(ZONE_LAYOUT[zone.id].halfX > 0.5);
  }
});

test("módulos de trama R1 existen", () => {
  for (const rel of [
    "js/city3d/trama/buildTrama.js",
    "js/city3d/trama/materials.js",
    "js/city3d/trama/textureKit.js",
    "js/city3d/trama/poc.js",
    "js/city3d/mount-trama-poc.js",
    "city3d-trama-poc.html",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
});

test("texturas ambientCG 1K de trama están presentes", () => {
  for (const rel of TEXTURE_COLORS) {
    const full = join(ROOT, rel);
    assert.ok(existsSync(full), `falta ${rel}`);
    assert.ok(statSync(full).size > 50_000, `${rel} demasiado liviano`);
  }
});

test("createCity3D es async y usa trama", () => {
  const index = readFileSync(join(ROOT, "js/city3d/index.js"), "utf8");
  const build = readFileSync(join(ROOT, "js/city3d/buildCity.js"), "utf8");
  const ui = readFileSync(join(ROOT, "js/ui/city.js"), "utf8");
  assert.match(index, /async function createCity3D/);
  assert.match(index, /loadTramaTextureKit/);
  assert.match(build, /buildUrbanTrama/);
  assert.match(ui, /await createCity3D/);
});

test("CREDITS documenta texturas ambientCG CC0", () => {
  const credits = readFileSync(join(ROOT, "assets/city3d/CREDITS.md"), "utf8");
  assert.match(credits, /Asphalt033/);
  assert.match(credits, /PavingStones055/);
  assert.match(credits, /Grass001/);
  assert.match(credits, /Concrete034/);
  assert.match(credits, /CC0/);
});

test("export-static incluye trama y texturas", () => {
  const script = readFileSync(join(ROOT, "scripts/export-static.mjs"), "utf8");
  assert.match(script, /city3d-trama-poc\.html/);
  assert.match(script, /buildTrama\.js/);
  assert.match(script, /Asphalt033_1K-JPG_Color\.jpg/);
});

test("si existe .vercel-out, incluye texturas y PoC de trama", () => {
  const out = join(ROOT, ".vercel-out");
  if (!existsSync(out)) return;
  for (const rel of [
    ...TEXTURE_COLORS,
    "js/city3d/trama/buildTrama.js",
    "city3d-trama-poc.html",
  ]) {
    assert.ok(existsSync(join(out, rel)), `falta en export: ${rel}`);
  }
});
