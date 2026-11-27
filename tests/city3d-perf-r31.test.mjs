/**
 * R3.1 — optimización y perfiles de calidad.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { QUALITY_PROFILES, resolveQualityProfile } from "../js/city3d/quality/profile.js";

const ROOT = join(import.meta.dirname, "..");

test("existen perfiles desktop y mobile", () => {
  assert.ok(QUALITY_PROFILES.desktop);
  assert.ok(QUALITY_PROFILES.mobile);
  assert.equal(QUALITY_PROFILES.desktop.shadows, true);
  assert.equal(QUALITY_PROFILES.mobile.shadows, false);
  assert.ok(QUALITY_PROFILES.desktop.mergeBuildings);
  assert.ok(QUALITY_PROFILES.desktop.buildingLod);
  assert.ok(QUALITY_PROFILES.mobile.landscapeDensity < 1);
});

test("resolveQualityProfile respeta id forzado", () => {
  assert.equal(resolveQualityProfile("mobile").id, "mobile");
  assert.equal(resolveQualityProfile("desktop").id, "desktop");
});

test("módulos R3.1 de merge/LOD/perf existen", () => {
  for (const rel of [
    "js/city3d/architecture/mergeBuilding.js",
    "js/city3d/architecture/lod.js",
    "js/city3d/quality/profile.js",
    "js/city3d/perf/stats.js",
    "js/city3d/perf/benchmark.js",
    "js/city3d/mount-perf-poc.js",
    "city3d-perf-poc.html",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
});

test("placeCity integra merge/LOD", () => {
  const src = readFileSync(join(ROOT, "js/city3d/architecture/placeCity.js"), "utf8");
  assert.match(src, /mergeBuildingMeshes|buildBuildingLodSet/);
  assert.match(src, /createBuildingLod/);
});

test("createCity3D aplica perfil de calidad", () => {
  const index = readFileSync(join(ROOT, "js/city3d/index.js"), "utf8");
  assert.match(index, /resolveQualityProfile/);
  assert.match(index, /isLOD/);
});

test("assemble soporta detail high/mid/low", () => {
  const src = readFileSync(join(ROOT, "js/city3d/architecture/assemble.js"), "utf8");
  assert.match(src, /detail/);
  assert.match(src, /"high"/);
  assert.match(src, /"mid"/);
  assert.match(src, /"low"/);
});

test("export-static incluye perf poc y merge", () => {
  const script = readFileSync(join(ROOT, "scripts/export-static.mjs"), "utf8");
  assert.match(script, /city3d-perf-poc\.html/);
  assert.match(script, /mergeBuilding\.js/);
  assert.match(script, /quality\/profile\.js/);
});
