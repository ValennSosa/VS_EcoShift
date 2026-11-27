/**
 * Evaluación de los cuatro desafíos educativos.
 * Usa indicadores con precisión completa del motor (sin redondeo intermedio).
 * No modifica variables, presets ni persistencia.
 */

export const CHALLENGE_IDS = ["emisiones", "renovable", "superficie", "movilidad"];

export const CHALLENGES = [
  {
    id: "emisiones",
    index: "Meta 01",
    title: "Reducir emisiones un 20%",
    indicatorKey: "emissions",
    description:
      "La reducción se calcula contra el valor completo de emisiones de Ciudad actual. Tiene que bajar al menos un 20% de esa cifra.",
  },
  {
    id: "renovable",
    index: "Meta 02",
    title: "Alcanzar 40 de energía renovable",
    indicatorKey: "renewableEnergy",
    description:
      "El indicador completo de energía renovable tiene que ser mayor o igual a 40. El redondeo de pantalla no cuenta.",
  },
  {
    id: "superficie",
    index: "Meta 03",
    title: "Sumar 15 puntos de superficie verde",
    indicatorKey: "greenSurface",
    description:
      "Hacen falta al menos 15 puntos del indicador respecto de Ciudad actual. No es un 15% relativo.",
  },
  {
    id: "movilidad",
    index: "Meta 04",
    title: "Llegar a 55 de movilidad sostenible",
    indicatorKey: "sustainableMobility",
    description:
      "El indicador completo de movilidad sostenible tiene que ser mayor o igual a 55.",
  },
];

const EMISSIONS_REDUCTION_TARGET = 0.2;
const RENEWABLE_TARGET = 40;
const GREEN_SURFACE_DELTA = 15;
const MOBILITY_TARGET = 55;

/**
 * Evalúa los cuatro desafíos contra Ciudad actual.
 * @param {object} currentIndicators indicadores del escenario/borrador (precision completa)
 * @param {object} baselineIndicators indicadores de Ciudad actual (precision completa)
 */
export function evaluateChallenges(currentIndicators, baselineIndicators) {
  if (!currentIndicators || !baselineIndicators) {
    throw new Error("Se necesitan indicadores actuales y de Ciudad actual.");
  }

  return CHALLENGES.map((challenge) => evaluateOne(challenge, currentIndicators, baselineIndicators));
}

/** Atajo: acepta resultados completos de simulate(). */
export function evaluateFromResults(currentResult, baselineResult) {
  return evaluateChallenges(currentResult.indicators, baselineResult.indicators);
}

export function countMet(evaluations) {
  return evaluations.filter((item) => item.met).length;
}

function evaluateOne(challenge, current, baseline) {
  switch (challenge.id) {
    case "emisiones":
      return evaluateEmissions(challenge, current, baseline);
    case "renovable":
      return evaluateThreshold(challenge, current.renewableEnergy, RENEWABLE_TARGET, "higher");
    case "superficie":
      return evaluateThreshold(
        challenge,
        current.greenSurface,
        baseline.greenSurface + GREEN_SURFACE_DELTA,
        "higher"
      );
    case "movilidad":
      return evaluateThreshold(challenge, current.sustainableMobility, MOBILITY_TARGET, "higher");
    default:
      throw new Error(`Desafío desconocido: ${challenge.id}`);
  }
}

function evaluateEmissions(challenge, current, baseline) {
  const initial = baseline.emissions;
  const value = current.emissions;

  // Protección: sin emisiones iniciales positivas no hay ratio válido.
  if (!Number.isFinite(initial) || initial <= 0) {
    return {
      id: challenge.id,
      index: challenge.index,
      title: challenge.title,
      description: challenge.description,
      indicatorKey: challenge.indicatorKey,
      met: false,
      statusLabel: "Pendiente",
      value,
      target: null,
      baselineValue: initial,
      ratio: null,
      detail: "No se puede evaluar la reducción: las emisiones de Ciudad actual no son mayores que cero.",
    };
  }

  const ratio = (initial - value) / initial;
  const target = initial * (1 - EMISSIONS_REDUCTION_TARGET);
  const met = ratio >= EMISSIONS_REDUCTION_TARGET;

  return {
    id: challenge.id,
    index: challenge.index,
    title: challenge.title,
    description: challenge.description,
    indicatorKey: challenge.indicatorKey,
    met,
    statusLabel: met ? "Cumplido" : "Pendiente",
    value,
    target,
    baselineValue: initial,
    ratio,
    detail: met
      ? "La reducción de emisiones alcanza o supera el 20% respecto de Ciudad actual."
      : "Todavía no se alcanza una reducción del 20% respecto de Ciudad actual.",
  };
}

function evaluateThreshold(challenge, value, target, direction) {
  const met = direction === "higher" ? value >= target : value <= target;
  return {
    id: challenge.id,
    index: challenge.index,
    title: challenge.title,
    description: challenge.description,
    indicatorKey: challenge.indicatorKey,
    met,
    statusLabel: met ? "Cumplido" : "Pendiente",
    value,
    target,
    baselineValue: null,
    ratio: null,
    detail: met ? "El valor completo cumple el umbral del desafío." : "El valor completo aún no alcanza el umbral.",
  };
}
