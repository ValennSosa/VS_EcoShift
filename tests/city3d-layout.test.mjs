import assert from "node:assert/strict";
import test from "node:test";

import { ZONE_DEFINITIONS } from "../js/sim/zones.js";
import { CITY_SEED, getCityLayout, ZONE_LAYOUT } from "../js/city3d/layout.js";
import { createRng } from "../js/city3d/rng.js";

test("el layout cubre las seis zonas del motor", () => {
  const layout = getCityLayout();
  assert.equal(layout.seed, CITY_SEED);
  for (const zone of ZONE_DEFINITIONS) {
    assert.ok(layout.zones[zone.id], `falta layout para ${zone.id}`);
    assert.equal(ZONE_LAYOUT[zone.id].id, zone.id);
  }
  assert.ok(layout.roads.length >= 4);
  assert.ok(layout.blocks?.length === 9);
});

test("el PRNG es determinista con la misma semilla", () => {
  const a = createRng(CITY_SEED);
  const b = createRng(CITY_SEED);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test("dos semillas distintas divergen", () => {
  const a = createRng(CITY_SEED);
  const b = createRng(CITY_SEED + 1);
  assert.notEqual(a(), b());
});
