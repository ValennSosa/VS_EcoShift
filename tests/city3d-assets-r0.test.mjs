/**
 * R0 — fundaciones de assets city3d (catálogo, archivos, export).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");

const REQUIRED_LOADERS = [
  "node_modules/three/examples/jsm/loaders/GLTFLoader.js",
  "node_modules/three/examples/jsm/loaders/HDRLoader.js",
  "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
  "node_modules/three/examples/jsm/utils/SkeletonUtils.js",
];

const REQUIRED_ASSETS = [
  "assets/city3d/manifest.json",
  "assets/city3d/CREDITS.md",
  "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf",
  "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade.bin",
  "assets/city3d/models/potted_plant_02/potted_plant_02_1k.gltf",
  "assets/city3d/models/potted_plant_02/potted_plant_02.bin",
  "assets/city3d/hdri/kloppenheim_06_puresky_1k.hdr",
];

const REQUIRED_MODULES = [
  "js/city3d/assets/catalog.js",
  "js/city3d/assets/loader.js",
  "js/city3d/assets/normalize.js",
  "js/city3d/assets/disposeGltf.js",
  "js/city3d/assets/poc.js",
  "js/city3d/mount-assets-poc.js",
  "city3d-assets-poc.html",
];

test("módulos R0 de assets existen", () => {
  for (const rel of REQUIRED_MODULES) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
});

test("loaders Three.js requeridos por R0 están instalados", () => {
  for (const rel of REQUIRED_LOADERS) {
    const full = join(ROOT, rel);
    assert.ok(existsSync(full), `falta ${rel}`);
    assert.ok(statSync(full).size > 0);
  }
});

test("assets PoC existen y pesan más que un placeholder vacío", () => {
  for (const rel of REQUIRED_ASSETS) {
    const full = join(ROOT, rel);
    assert.ok(existsSync(full), `falta ${rel}`);
    assert.ok(statSync(full).size > 64, `${rel} demasiado pequeño`);
  }
  const facadeBin = statSync(
    join(ROOT, "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade.bin")
  ).size;
  assert.ok(facadeBin > 1_000_000, "el bin de la fachada debería ser un modelo real");
});

test("manifest declara solo CC0 y entradas PoC resolubles", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "assets/city3d/manifest.json"), "utf8"));
  assert.equal(manifest.licensePolicy, "CC0-only-verified");
  assert.ok(Array.isArray(manifest.assets));
  const poc = manifest.assets.filter((a) => a.poc);
  assert.ok(poc.length >= 3, "se esperan ≥3 assets PoC (2 modelos + HDRI)");
  for (const entry of poc) {
    assert.match(entry.license, /CC0/i);
    assert.ok(entry.url, `${entry.id} sin url`);
    const abs = join(ROOT, "assets/city3d", entry.url.replace(/^\.\//, ""));
    assert.ok(existsSync(abs), `ruta rota en manifest: ${entry.id} → ${entry.url}`);
  }
});

test("la ciudad procedural no fue reemplazada por la PoC", () => {
  const world = readFileSync(join(ROOT, "js/city3d/world.js"), "utf8");
  const index = readFileSync(join(ROOT, "js/city3d/index.js"), "utf8");
  assert.match(world, /buildProceduralCity/);
  assert.doesNotMatch(index, /createAssetPoc/);
  assert.doesNotMatch(world, /createAssetPoc/);
});

test("export-static copia loaders y assets city3d", () => {
  const script = readFileSync(join(ROOT, "scripts/export-static.mjs"), "utf8");
  for (const rel of [
    ...REQUIRED_LOADERS,
    "assets/city3d/manifest.json",
    "js/city3d/assets/loader.js",
    "city3d-assets-poc.html",
  ]) {
    assert.ok(script.includes(rel.replace(/\\/g, "/")) || script.includes(rel), `export no menciona ${rel}`);
  }
});

test("si existe .vercel-out, incluye R0 assets y loaders", () => {
  const out = join(ROOT, ".vercel-out");
  if (!existsSync(out)) return;
  for (const rel of [...REQUIRED_LOADERS, ...REQUIRED_ASSETS, "js/city3d/assets/loader.js"]) {
    const full = join(out, rel);
    assert.ok(existsSync(full), `falta en export: ${rel}`);
    assert.ok(statSync(full).size > 0);
  }
});
