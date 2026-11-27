/**
 * R2 — arquitectura urbana (tipologías, kit, export).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { CITY_PLACEMENTS, TYPOLOGIES } from "../js/city3d/architecture/constants.js";
import { ZONE_DEFINITIONS } from "../js/sim/zones.js";

const ROOT = join(import.meta.dirname, "..");

test("existen 5 tipologías arquitectónicas documentadas", () => {
  const ids = Object.keys(TYPOLOGIES);
  assert.equal(ids.length, 5);
  for (const id of ids) {
    const t = TYPOLOGIES[id];
    assert.ok(t.floors >= 2);
    assert.ok(t.baysX >= 1);
    assert.ok(t.cityScale > 0.5 && t.cityScale < 1.2);
    assert.ok(t.cityScaleY > 0.2 && t.cityScaleY < 0.6);
    assert.ok(t.roof);
  }
});

test("las colocaciones cubren zonas del motor y lotes vacíos R1", () => {
  const zoneIds = new Set(CITY_PLACEMENTS.map((p) => p.zoneId).filter(Boolean));
  for (const zone of ZONE_DEFINITIONS) {
    if (zone.id === "green") continue; // parque sin tipología edilicia
    assert.ok(
      zoneIds.has(zone.id) || CITY_PLACEMENTS.some((p) => p.blockId),
      `zona ${zone.id} sin cobertura arquitectónica`
    );
  }
  assert.ok(CITY_PLACEMENTS.some((p) => p.zoneId === "residential"));
  assert.ok(CITY_PLACEMENTS.some((p) => p.zoneId === "commercial"));
  assert.ok(CITY_PLACEMENTS.some((p) => p.blockId === "block-0-2"));
  assert.ok(CITY_PLACEMENTS.some((p) => p.blockId === "block-2-0"));
  assert.ok(CITY_PLACEMENTS.some((p) => p.blockId === "block-2-2"));
});

test("módulos R2 de arquitectura existen", () => {
  for (const rel of [
    "js/city3d/architecture/constants.js",
    "js/city3d/architecture/facadeKit.js",
    "js/city3d/architecture/assemble.js",
    "js/city3d/architecture/placeCity.js",
    "js/city3d/architecture/poc.js",
    "js/city3d/mount-architecture-poc.js",
    "city3d-architecture-poc.html",
  ]) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
});

test("el kit Poly Haven de fachadas sigue disponible", () => {
  const gltf = join(
    ROOT,
    "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf"
  );
  const bin = join(
    ROOT,
    "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade.bin"
  );
  assert.ok(existsSync(gltf));
  assert.ok(existsSync(bin));
  assert.ok(statSync(bin).size > 1_000_000);
  const json = JSON.parse(readFileSync(gltf, "utf8"));
  assert.ok((json.nodes?.length || 0) > 100);
});

test("createCity3D carga facadeKit y buildCity coloca arquitectura", () => {
  const index = readFileSync(join(ROOT, "js/city3d/index.js"), "utf8");
  const build = readFileSync(join(ROOT, "js/city3d/buildCity.js"), "utf8");
  assert.match(index, /loadFacadeKit/);
  assert.match(build, /placeArchitecture/);
  assert.doesNotMatch(build, /buildResidential\(/);
});

test("CREDITS documenta el ensamblado R2", () => {
  const credits = readFileSync(join(ROOT, "assets/city3d/CREDITS.md"), "utf8");
  assert.match(credits, /Modular Urban Apartments Facade/);
  assert.match(credits, /R2/);
  assert.match(credits, /CC0/);
});

test("export-static incluye PoC y módulos de arquitectura", () => {
  const script = readFileSync(join(ROOT, "scripts/export-static.mjs"), "utf8");
  assert.match(script, /city3d-architecture-poc\.html/);
  assert.match(script, /architecture\/assemble\.js/);
  assert.match(script, /architecture\/facadeKit\.js/);
});

test("si existe .vercel-out, incluye arquitectura R2", () => {
  const out = join(ROOT, ".vercel-out");
  if (!existsSync(out)) return;
  for (const rel of [
    "js/city3d/architecture/assemble.js",
    "js/city3d/architecture/facadeKit.js",
    "city3d-architecture-poc.html",
    "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf",
  ]) {
    assert.ok(existsSync(join(out, rel)), `falta en export: ${rel}`);
  }
});
