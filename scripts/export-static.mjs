import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
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
cpSync(
  "node_modules/@kurkle/color/dist/color.esm.js",
  join(out, "node_modules/@kurkle/color/dist/color.esm.js")
);

console.log(`Export estático listo en ${out}`);
