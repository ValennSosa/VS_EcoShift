/**
 * PRNG determinista (LCG). Misma semilla → misma secuencia.
 */
export function createRng(seed = 0xe00517f7) {
  let state = seed >>> 0;
  return function rng() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function rngRange(rng, min, max) {
  return min + (max - min) * rng();
}

export function rngPick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}
