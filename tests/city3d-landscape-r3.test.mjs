/**
 * R3 — paisaje urbano (vegetación, movilidad, mobiliario, parque).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");

test("módulos R3 de paisaje existen", () => {
  for (const rel of [
    "js/city3d/landscape/materials.js",
    "js/city3d/landscape/trees.js",
    "js/city3d/landscape/plants.js",
    "js/city3d/landscape/plantKit.js",
    "js/city3d/landscape/mobility.js",
    "js/city3d/landscape/furniture.js",
    "js/city3d/landscape/park.js",
    "js/city3d/landscape/place.js",
    "js/city3d/landscape/instancing.js",
    "js/city3d/landscape/poc.js",
    "js/city3d/mount-landscape-poc.js",
    "city3d-landscape-poc.html",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
});

test("assets vegetales Poly Haven livianos están presentes", () => {
  for (const rel of [
    "assets/city3d/models/shrub_04/shrub_04_1k.gltf",
    "assets/city3d/models/fern_02/fern_02_1k.gltf",
    "assets/city3d/models/potted_plant_04/potted_plant_04_1k.gltf",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
    assert.ok(statSync(join(ROOT, rel)).size > 200);
  }
});

test("texturas PBR de paisaje (bark/foliage/metal) están presentes", () => {
  for (const rel of [
    "assets/city3d/textures/bark/Bark012_1K-JPG_Color.jpg",
    "assets/city3d/textures/foliage/ScatteredLeaves008_1K-JPG_Color.jpg",
    "assets/city3d/textures/metal/Metal032_1K-JPG_Color.jpg",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
    assert.ok(statSync(join(ROOT, rel)).size > 10_000);
  }
});

test("peso de modelos vegetales R3 es viable para web (< 8 MB cada carpeta)", () => {
  for (const dir of ["shrub_04", "fern_02", "potted_plant_04"]) {
    const base = join(ROOT, "assets/city3d/models", dir);
    const bytes = sumDir(base);
    assert.ok(bytes > 100_000, `${dir} demasiado pequeño`);
    assert.ok(bytes < 8_000_000, `${dir} demasiado pesado: ${bytes}`);
  }
});

test("createCity3D carga paisaje y buildCity coloca landscape", () => {
  const index = readFileSync(join(ROOT, "js/city3d/index.js"), "utf8");
  const build = readFileSync(join(ROOT, "js/city3d/buildCity.js"), "utf8");
  assert.match(index, /loadLandscapeMaterials/);
  assert.match(index, /loadPlantKit/);
  assert.match(build, /placeLandscape/);
  assert.doesNotMatch(build, /SphereGeometry/);
  assert.doesNotMatch(build, /buildGreenAmenities/);
  assert.doesNotMatch(build, /buildStreetFurniture/);
  assert.doesNotMatch(build, /buildTransportProps/);
});

test("árboles no usan esferas como geometría de copa", () => {
  const trees = readFileSync(join(ROOT, "js/city3d/landscape/trees.js"), "utf8");
  assert.match(trees, /IcosahedronGeometry/);
  assert.doesNotMatch(trees, /SphereGeometry/);
});

test("parque central se construye sin tipologías edilicias", () => {
  const park = readFileSync(join(ROOT, "js/city3d/landscape/park.js"), "utf8");
  assert.match(park, /buildCentralPark/);
  assert.match(park, /pathStone|senderos|lago|water/i);
  assert.doesNotMatch(park, /placeArchitecture|assembleBuilding/);
});

test("CREDITS documenta recursos R3", () => {
  const credits = readFileSync(join(ROOT, "assets/city3d/CREDITS.md"), "utf8");
  assert.match(credits, /shrub_04|Shrub 04/);
  assert.match(credits, /Bark012/);
  assert.match(credits, /ScatteredLeaves008/);
  assert.match(credits, /R3/);
  assert.match(credits, /CC0/);
});

test("manifest incluye entradas de vegetación R3", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "assets/city3d/manifest.json"), "utf8"));
  const ids = new Set((manifest.assets || []).map((a) => a.id));
  assert.ok(ids.has("vegetation-shrub-04"));
  assert.ok(ids.has("vegetation-fern-02"));
  assert.ok(ids.has("vegetation-potted-plant-04"));
  assert.ok(ids.has("landscape-bark-012"));
});

test("export-static incluye PoC y módulos de paisaje", () => {
  const script = readFileSync(join(ROOT, "scripts/export-static.mjs"), "utf8");
  assert.match(script, /city3d-landscape-poc\.html/);
  assert.match(script, /landscape\/place\.js/);
  assert.match(script, /shrub_04/);
  assert.match(script, /Bark012/);
});

test("si existe .vercel-out, incluye paisaje R3", () => {
  const out = join(ROOT, ".vercel-out");
  if (!existsSync(out)) return;
  for (const rel of [
    "js/city3d/landscape/place.js",
    "city3d-landscape-poc.html",
    "assets/city3d/models/shrub_04/shrub_04_1k.gltf",
    "assets/city3d/textures/bark/Bark012_1K-JPG_Color.jpg",
  ]) {
    assert.ok(existsSync(join(out, rel)), `falta en export: ${rel}`);
  }
});

function sumDir(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += sumDir(full);
    else total += statSync(full).size;
  }
  return total;
}
