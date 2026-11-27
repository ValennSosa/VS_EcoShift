export const READINGS = [
  {
    key: "emissions",
    label: "Emisiones de CO₂",
    direction: "lower",
    scale: "Índice de 0 a 100. Un valor más bajo es mejor.",
  },
  {
    key: "airQuality",
    label: "Calidad del aire",
    direction: "higher",
    scale: "Índice de 0 a 100. Un valor más alto es mejor.",
  },
  {
    key: "energyConsumption",
    label: "Consumo energético",
    direction: "lower",
    scale: "Índice de 0 a 100. Un valor más bajo es mejor. El transporte eléctrico puede subirlo.",
  },
  {
    key: "renewableEnergy",
    label: "Energía renovable",
    direction: "higher",
    scale: "Índice de 0 a 100. Un valor más alto es mejor.",
  },
  {
    key: "greenSurface",
    label: "Superficie verde",
    direction: "higher",
    scale: "Puntos del indicador. Un valor más alto es mejor.",
  },
  {
    key: "sustainableMobility",
    label: "Movilidad sostenible",
    direction: "higher",
    scale: "Índice de 0 a 100. Un valor más alto es mejor.",
  },
  {
    key: "recycling",
    label: "Reciclaje",
    direction: "higher",
    scale: "Índice de 0 a 100. Un valor más alto es mejor.",
  },
];

const numberFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const deltaFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function renderIndicators(container) {
  container.replaceChildren();

  for (const reading of READINGS) {
    const item = document.createElement("li");
    item.className = "reading-row";
    item.dataset.indicator = reading.key;

    const top = document.createElement("div");
    top.className = "reading-row__top";

    const name = document.createElement("span");
    name.className = "reading-row__name";
    name.textContent = reading.label;

    const value = document.createElement("span");
    value.className = "reading-row__value";

    const scale = document.createElement("p");
    scale.textContent = reading.scale;

    const change = document.createElement("p");
    change.className = "reading-change";

    top.append(name, value);
    item.append(top, scale, change);
    container.append(item);
  }
}

export function updateIndicators(container, scoreNode, result, baseline) {
  if (!container || !result?.indicators || !baseline?.indicators) return;

  for (const reading of READINGS) {
    const item = container.querySelector(`[data-indicator="${reading.key}"]`);
    if (!item) continue;
    const valueNode = item.querySelector(".reading-row__value");
    const changeNode = item.querySelector(".reading-change");
    if (!valueNode || !changeNode) continue;
    const change = describeChange(result.indicators[reading.key], baseline.indicators[reading.key], reading.direction);
    valueNode.textContent = numberFormat.format(result.indicators[reading.key]);
    paintChange(changeNode, change);
  }

  if (!scoreNode) return;
  const scoreChange = describeChange(result.score, baseline.score, "higher");
  scoreNode.textContent = `Valoración educativa: ${numberFormat.format(result.score)}. ${changeText(scoreChange)}`;
}

export function updateSummary(summary, result, baseline) {
  const changes = READINGS.map((reading) =>
    describeChange(result.indicators[reading.key], baseline.indicators[reading.key], reading.direction)
  );
  const improvements = changes.filter((change) => change.status === "improved").length;
  const regressions = changes.filter((change) => change.status === "regressed").length;

  if (improvements === 0 && regressions === 0) {
    summary.textContent = `Indicadores sin cambios respecto de Ciudad actual. Valoración ${numberFormat.format(result.score)}.`;
    return;
  }

  summary.textContent = `Valoración educativa ${numberFormat.format(result.score)}. ${improvements} mejoras y ${regressions} retrocesos respecto de Ciudad actual.`;
}

/** Comparación educativa contra Ciudad actual. Usa valores completos del motor. */
export function buildComparisonRows(result, baseline) {
  return READINGS.map((reading) => {
    const current = result.indicators[reading.key];
    const reference = baseline.indicators[reading.key];
    const change = describeChange(current, reference, reading.direction);
    return {
      key: reading.key,
      label: reading.label,
      direction: reading.direction,
      current,
      baseline: reference,
      displayCurrent: numberFormat.format(current),
      displayBaseline: numberFormat.format(reference),
      change,
      changeText: changeText(change),
    };
  });
}

export function summarizeComparison(rows) {
  const improvements = rows.filter((row) => row.change.status === "improved").map((row) => row.label);
  const regressions = rows.filter((row) => row.change.status === "regressed").map((row) => row.label);
  const same = rows.filter((row) => row.change.status === "same").map((row) => row.label);

  return {
    improvements,
    regressions,
    same,
    text: comparisonNarrative(improvements, regressions, same),
  };
}

export function describeChange(current, baselineValue, direction) {
  const delta = current - baselineValue;
  if (Math.abs(delta) < 1e-9) return { status: "same", label: "Sin cambios", delta };
  const improved = direction === "lower" ? delta < 0 : delta > 0;
  return { status: improved ? "improved" : "regressed", label: improved ? "Mejora" : "Retroceso", delta };
}

function comparisonNarrative(improvements, regressions, same) {
  if (!improvements.length && !regressions.length) {
    return "Sin cambios respecto de Ciudad actual en los siete indicadores.";
  }

  const parts = [];
  if (improvements.length) parts.push(`Mejoran: ${improvements.join(", ")}.`);
  if (regressions.length) parts.push(`Retroceden: ${regressions.join(", ")}.`);
  if (same.length) parts.push(`Sin cambios: ${same.join(", ")}.`);
  return parts.join(" ");
}

function paintChange(node, change) {
  node.className = `reading-change reading-change--${change.status}`;
  node.textContent = changeText(change);
}

function changeText(change) {
  if (change.status === "same") return "Sin cambios";
  if (Number(change.delta.toFixed(1)) === 0) return change.label;
  return `${change.label} · ${deltaFormat.format(change.delta)}`;
}
