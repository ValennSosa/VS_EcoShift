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
  "city3d-assets-poc.html",
  "city3d-trama-poc.html",
  "city3d-architecture-poc.html",
  "city3d-landscape-poc.html",
  "city3d-perf-poc.html",
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
// R0: GLTFLoader → BufferGeometryUtils + SkeletonUtils; HDRLoader para IBL.
mkdirSync(join(out, "node_modules/three/build"), { recursive: true });
mkdirSync(join(out, "node_modules/three/examples/jsm/controls"), { recursive: true });
mkdirSync(join(out, "node_modules/three/examples/jsm/loaders"), { recursive: true });
mkdirSync(join(out, "node_modules/three/examples/jsm/utils"), { recursive: true });
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
cpSync(
  "node_modules/three/examples/jsm/loaders/GLTFLoader.js",
  join(out, "node_modules/three/examples/jsm/loaders/GLTFLoader.js")
);
cpSync(
  "node_modules/three/examples/jsm/loaders/HDRLoader.js",
  join(out, "node_modules/three/examples/jsm/loaders/HDRLoader.js")
);
cpSync(
  "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
  join(out, "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js")
);
cpSync(
  "node_modules/three/examples/jsm/utils/SkeletonUtils.js",
  join(out, "node_modules/three/examples/jsm/utils/SkeletonUtils.js")
);

const requiredOutFiles = [
  "node_modules/chart.js/dist/chart.js",
  "node_modules/chart.js/auto/auto.js",
  "node_modules/chart.js/dist/chunks/helpers.dataset.js",
  "node_modules/@kurkle/color/dist/color.esm.js",
  "node_modules/three/build/three.module.js",
  "node_modules/three/build/three.core.js",
  "node_modules/three/examples/jsm/controls/OrbitControls.js",
  "node_modules/three/examples/jsm/loaders/GLTFLoader.js",
  "node_modules/three/examples/jsm/loaders/HDRLoader.js",
  "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
  "node_modules/three/examples/jsm/utils/SkeletonUtils.js",
  "assets/city3d/manifest.json",
  "assets/city3d/models/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf",
  "assets/city3d/models/potted_plant_02/potted_plant_02_1k.gltf",
  "assets/city3d/hdri/kloppenheim_06_puresky_1k.hdr",
  "assets/city3d/textures/asphalt/Asphalt033_1K-JPG_Color.jpg",
  "assets/city3d/textures/sidewalk/PavingStones055_1K-JPG_Color.jpg",
  "assets/city3d/textures/grass/Grass001_1K-JPG_Color.jpg",
  "assets/city3d/textures/lot/Concrete034_1K-JPG_Color.jpg",
  "assets/city3d/textures/bark/Bark012_1K-JPG_Color.jpg",
  "assets/city3d/textures/foliage/ScatteredLeaves008_1K-JPG_Color.jpg",
  "assets/city3d/textures/metal/Metal032_1K-JPG_Color.jpg",
  "assets/city3d/models/shrub_04/shrub_04_1k.gltf",
  "assets/city3d/models/fern_02/fern_02_1k.gltf",
  "assets/city3d/models/potted_plant_04/potted_plant_04_1k.gltf",
  "js/city3d/assets/loader.js",
  "js/city3d/trama/buildTrama.js",
  "js/city3d/architecture/assemble.js",
  "js/city3d/architecture/facadeKit.js",
  "js/city3d/landscape/place.js",
  "js/city3d/landscape/materials.js",
  "js/city3d/architecture/mergeBuilding.js",
  "js/city3d/quality/profile.js",
  "js/city3d/perf/benchmark.js",
  "js/city3d/visual/applyVisualState.js",
  "js/city3d/visual/mapVariables.js",
  "city3d-assets-poc.html",
  "city3d-trama-poc.html",
  "city3d-architecture-poc.html",
  "city3d-landscape-poc.html",
  "city3d-perf-poc.html",
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
