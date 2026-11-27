/**
 * Valida el grafo mínimo de Three.js para export estático (Etapas 0–1).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");

const REQUIRED_THREE = [
  "node_modules/three/build/three.module.js",
  "node_modules/three/build/three.core.js",
  "node_modules/three/examples/jsm/controls/OrbitControls.js",
];

test("Three.js 0.187.0 está instalado con los archivos del grafo 3D", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "node_modules/three/package.json"), "utf8"));
  assert.equal(pkg.version, "0.187.0");

  for (const rel of REQUIRED_THREE) {
    const full = join(ROOT, rel);
    assert.ok(existsSync(full), `falta ${rel}`);
    assert.ok(statSync(full).isFile());
    assert.ok(statSync(full).size > 0, `${rel} vacío`);
  }
});

test("three.module.js importa three.core.js", () => {
  const source = readFileSync(join(ROOT, "node_modules/three/build/three.module.js"), "utf8");
  assert.match(source, /from ['"]\.\/three\.core\.js['"]/);
});

test("OrbitControls solo depende del bare specifier three", () => {
  const source = readFileSync(
    join(ROOT, "node_modules/three/examples/jsm/controls/OrbitControls.js"),
    "utf8"
  );
  assert.match(source, /from ['"]three['"]/);
  assert.doesNotMatch(source, /from ['"]\.\.\//);
});

test("export-static.mjs copia y valida los paths de Three.js", () => {
  const script = readFileSync(join(ROOT, "scripts/export-static.mjs"), "utf8");
  for (const rel of REQUIRED_THREE) {
    assert.ok(script.includes(rel), `export no menciona ${rel}`);
  }
});

test("módulos city3d de Etapa 1–2 existen", () => {
  const files = [
    "js/city3d/index.js",
    "js/city3d/detect.js",
    "js/city3d/scene.js",
    "js/city3d/camera.js",
    "js/city3d/renderer.js",
    "js/city3d/controls.js",
    "js/city3d/lights.js",
    "js/city3d/world.js",
    "js/city3d/dispose.js",
    "js/city3d/buildCity.js",
    "js/city3d/layout.js",
    "js/city3d/materials.js",
    "js/city3d/rng.js",
  ];
  for (const rel of files) {
    assert.ok(existsSync(join(ROOT, rel)), `falta ${rel}`);
  }
  assert.equal(existsSync(join(ROOT, "js/city3d/spike.js")), false);
  assert.equal(existsSync(join(ROOT, "js/city3d/mount-spike.js")), false);
});

test("si existe .vercel-out, incluye los módulos Three requeridos", () => {
  const out = join(ROOT, ".vercel-out");
  if (!existsSync(out)) return;
  for (const rel of REQUIRED_THREE) {
    const full = join(out, rel);
    assert.ok(existsSync(full), `falta en export: ${rel}`);
    assert.ok(statSync(full).size > 0);
  }
  assert.ok(existsSync(join(out, "js/city3d/index.js")));
});
