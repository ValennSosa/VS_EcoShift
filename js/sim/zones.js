/**
 * Estados visuales de las seis zonas urbanas.
 * Deriva niveles a partir de las variables normalizadas del motor.
 * No recalcula indicadores ni muta la entrada.
 *
 * Niveles:
 * - low: 0–33
 * - medium: 34–66
 * - high: 67–100
 *
 * El nivel general de una zona es el promedio de sus variables relacionadas,
 * redondeado al entero más cercano y luego clasificado.
 * Cada característica visual (solar, vegetación, etc.) usa el nivel de su variable.
 */

import { normalizeVariables } from "./engine.js";

export const LEVELS = ["low", "medium", "high"];

export const VARIABLE_LABELS = {
  greenSpaces: "Espacios verdes",
  electricTransport: "Transporte eléctrico",
  solarEnergy: "Energía solar",
  energyEfficiency: "Eficiencia energética",
  wasteManagement: "Gestión de residuos",
  bicycleUse: "Uso de bicicletas",
  recycling: "Reciclaje",
};

export const ZONE_DEFINITIONS = [
  {
    id: "residential",
    name: "Residencial",
    description:
      "Viviendas y edificios de barrio. La eficiencia, la energía solar y el reciclaje doméstico definen su estado.",
    effect:
      "Más eficiencia mejora la condición energética de los edificios. Más paneles solares aparecen en las azoteas. Más reciclaje suma puntos de separación de residuos.",
    variables: ["energyEfficiency", "solarEnergy", "recycling"],
    features: {
      efficiency: "energyEfficiency",
      solar: "solarEnergy",
      recycling: "recycling",
    },
  },
  {
    id: "commercial",
    name: "Comercial",
    description:
      "Comercios y oficinas del centro. Depende de la eficiencia energética y de cómo se gestionan los materiales.",
    effect:
      "Una mayor eficiencia mejora la lectura energética de los edificios. El reciclaje y la gestión de residuos refuerzan la infraestructura de separación.",
    variables: ["energyEfficiency", "recycling", "wasteManagement"],
    features: {
      efficiency: "energyEfficiency",
      recycling: "recycling",
      waste: "wasteManagement",
    },
  },
  {
    id: "industrial",
    name: "Industrial",
    description:
      "Instalaciones productivas. Su imagen responde a la eficiencia, la generación solar y el tratamiento de residuos.",
    effect:
      "Más eficiencia ordena la planta. Más solar suma paneles. Una mejor gestión de residuos refuerza el tratamiento en el predio.",
    variables: ["energyEfficiency", "solarEnergy", "wasteManagement"],
    features: {
      efficiency: "energyEfficiency",
      solar: "solarEnergy",
      waste: "wasteManagement",
    },
  },
  {
    id: "green",
    name: "Espacios verdes",
    description:
      "Parques, arboledas y superficies vegetales de la ciudad ficticia.",
    effect:
      "Al subir los espacios verdes crece la vegetación visible: primero una base, luego más árboles y finalmente una cubierta densa.",
    variables: ["greenSpaces"],
    features: {
      vegetation: "greenSpaces",
    },
  },
  {
    id: "transport",
    name: "Transporte",
    description:
      "Calles, flota y movilidad. Combina electrificación del transporte y uso de bicicletas.",
    effect:
      "Más transporte eléctrico aumenta la flota electrificada. Más bicicletas refuerzan la infraestructura ciclista.",
    variables: ["electricTransport", "bicycleUse"],
    features: {
      electric: "electricTransport",
      bicycle: "bicycleUse",
    },
  },
  {
    id: "energy",
    name: "Energía",
    description:
      "Infraestructura energética de la ciudad. Concentra generación solar y eficiencia del sistema.",
    effect:
      "Más energía solar multiplica los paneles. Más eficiencia muestra una red más ordenada y menos pérdida visual.",
    variables: ["solarEnergy", "energyEfficiency"],
    features: {
      solar: "solarEnergy",
      efficiency: "energyEfficiency",
    },
  },
];

export function levelFromValue(value) {
  const numeric = Number(value);
  const clamped = Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 0;
  if (clamped <= 33) return "low";
  if (clamped <= 66) return "medium";
  return "high";
}

export function calculateZoneStates(variables) {
  const normalized = normalizeVariables(variables);
  const variableLevels = {};

  for (const [key, value] of Object.entries(normalized)) {
    variableLevels[key] = levelFromValue(value);
  }

  const zones = ZONE_DEFINITIONS.map((definition) => {
    const related = definition.variables.map((key) => ({
      key,
      label: VARIABLE_LABELS[key],
      value: normalized[key],
      level: variableLevels[key],
    }));

    const average =
      related.reduce((sum, item) => sum + item.value, 0) / related.length;
    const overallValue = Math.round(average);
    const features = {};

    for (const [feature, variableKey] of Object.entries(definition.features)) {
      features[feature] = variableLevels[variableKey];
    }

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      effect: definition.effect,
      variables: related,
      features,
      level: levelFromValue(overallValue),
      overallValue,
    };
  });

  return {
    variables: { ...normalized },
    variableLevels: { ...variableLevels },
    zones,
  };
}

export function getZoneState(states, zoneId) {
  return states.zones.find((zone) => zone.id === zoneId) || null;
}
