import { cpSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const out = ".vercel-out";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const files = [
  "index.html",
  "simulador.html",
  "escenarios.html",
  "desafios.html",
  "resultado.html",
  "robots.txt",
  "sitemap.xml",
];

for (const file of files) {
  if (existsSync(file)) cpSync(file, join(out, file));
}

cpSync("js", join(out, "js"), { recursive: true });
cpSync("styles", join(out, "styles"), { recursive: true });
cpSync("data", join(out, "data"), { recursive: true });

if (existsSync("assets")) {
  cpSync("assets", join(out, "assets"), { recursive: true });
}

if (!existsSync(join(out, "assets/brand/og-cover.png"))) {
  console.warn("Aviso: falta assets/brand/og-cover.png en el export.");
}

cpSync("node_modules/bootstrap/dist", join(out, "node_modules/bootstrap/dist"), {
  recursive: true,
});
cpSync("node_modules/aos/dist", join(out, "node_modules/aos/dist"), { recursive: true });

mkdirSync(join(out, "node_modules/chart.js/dist"), { recursive: true });
mkdirSync(join(out, "node_modules/chart.js/auto"), { recursive: true });
mkdirSync(join(out, "node_modules/@kurkle/color/dist"), { recursive: true });
cpSync(
  "node_modules/chart.js/dist/chart.js",
  join(out, "node_modules/chart.js/dist/chart.js")
);
cpSync(
  "node_modules/chart.js/auto/auto.js",
  join(out, "node_modules/chart.js/auto/auto.js")
);
// Chart.js ESM importa ./chunks/helpers.dataset.js desde dist/chart.js.
cpSync("node_modules/chart.js/dist/chunks", join(out, "node_modules/chart.js/dist/chunks"), {
  recursive: true,
});
cpSync(
  "node_modules/@kurkle/color/dist/color.esm.js",
  join(out, "node_modules/@kurkle/color/dist/color.esm.js")
);

// Three.js ESM: three.module.js importa ./three.core.js; OrbitControls importa "three".
mkdirSync(join(out, "node_modules/three/build"), { recursive: true });
mkdirSync(join(out, "node_modules/three/examples/jsm/controls"), { recursive: true });
cpSync(
  "node_modules/three/build/three.module.js",
  join(out, "node_modules/three/build/three.module.js")
);
cpSync(
  "node_modules/three/build/three.core.js",
  join(out, "node_modules/three/build/three.core.js")
);
cpSync(
  "node_modules/three/examples/jsm/controls/OrbitControls.js",
  join(out, "node_modules/three/examples/jsm/controls/OrbitControls.js")
);

const requiredOutFiles = [
  "node_modules/chart.js/dist/chart.js",
  "node_modules/chart.js/auto/auto.js",
  "node_modules/chart.js/dist/chunks/helpers.dataset.js",
  "node_modules/@kurkle/color/dist/color.esm.js",
  "node_modules/three/build/three.module.js",
  "node_modules/three/build/three.core.js",
  "node_modules/three/examples/jsm/controls/OrbitControls.js",
];

const missing = [];
for (const rel of requiredOutFiles) {
  const full = join(out, rel);
  if (!existsSync(full) || !statSync(full).isFile() || statSync(full).size < 1) {
    missing.push(rel);
  }
}

if (missing.length) {
  console.error("Export incompleto. Faltan dependencias requeridas en .vercel-out:");
  for (const rel of missing) console.error(`  - ${rel}`);
  process.exit(1);
}

console.log(`Export estático listo en ${out}`);
