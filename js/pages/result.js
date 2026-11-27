import { simulate } from "../sim/engine.js";
import { evaluateFromResults } from "../sim/challenges.js";
import { getCustomScenario } from "../state/scenarios.js";
import {
  ORIGIN,
  getBaselineVariables,
  getDraftMeta,
  getVariables,
  initState,
} from "../state/store.js";
import { initCharts, updateCharts } from "../ui/charts.js";
import { renderChallenges, summarizeChallengeStatus } from "../ui/challenges.js";
import {
  buildComparisonRows,
  renderIndicators,
  summarizeComparison,
  updateIndicators,
} from "../ui/indicators.js";

const numberFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export async function initResultPage() {
  const errorRoot = document.querySelector("[data-result-error]");
  const contentRoot = document.querySelector("[data-result-content]");
  if (!contentRoot) return;

  try {
    const response = await fetch("./data/presets.json");
    if (!response.ok) throw new Error("presets");
    const presets = (await response.json()).presets || [];
    const baselinePreset = presets.find((item) => item.id === "ciudad-actual");
    if (!baselinePreset) throw new Error("baseline");

    // Inicializa store solo para leer borrador/escenarios. La vista de ?scenario= no persiste ni muta.
    initState(baselinePreset.variables);

    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get("scenario");

    const baselineResult = simulate(getBaselineVariables());
    let currentResult;
    let sourceLabel;
    let sourceKind;
    let interpretationLead;

    if (scenarioId) {
      const scenario = getCustomScenario(scenarioId);
      if (!scenario) {
        showMissingScenario(errorRoot, contentRoot, scenarioId);
        return;
      }
      currentResult = simulate({ ...scenario.variables });
      sourceLabel = scenario.name;
      sourceKind = "scenario";
      interpretationLead = `Consulta de solo lectura del escenario propio «${scenario.name}». El borrador del simulador y lo guardado no se modifican.`;
    } else {
      currentResult = simulate(getVariables());
      const meta = getDraftMeta();
      sourceKind = "draft";
      sourceLabel = draftLabel(meta);
      interpretationLead = draftInterpretation(meta, currentResult, baselineResult);
    }

    if (errorRoot) {
      errorRoot.hidden = true;
      errorRoot.replaceChildren();
    }
    contentRoot.hidden = false;

    paintContext(document.querySelector("[data-result-context]"), interpretationLead, sourceLabel, sourceKind);
    paintScore(document.querySelector("[data-result-score]"), currentResult.score);
    paintInterpretation(document.querySelector("[data-result-interpretation]"), currentResult, baselineResult);

    const indicatorsRoot = document.querySelector("[data-indicators]");
    const scoreLine = document.querySelector("[data-score]");
    if (indicatorsRoot && scoreLine) {
      renderIndicators(indicatorsRoot);
      updateIndicators(indicatorsRoot, scoreLine, currentResult, baselineResult);
    }

    const challengesRoot = document.querySelector("[data-challenges]");
    const challengesSummary = document.querySelector("[data-challenges-summary]");
    const evaluations = evaluateFromResults(currentResult, baselineResult);
    if (challengesSummary) challengesSummary.textContent = summarizeChallengeStatus(evaluations);
    if (challengesRoot) renderChallenges(challengesRoot, evaluations, { headingId: "desafios-resultado-titulo" });

    const compareAlt = document.querySelector("[data-chart-compare-alt]");
    const compareCanvas = document.querySelector("[data-chart-compare]");
    initCharts({
      compareCanvas,
      compareText: compareAlt,
      currentLabel: sourceKind === "scenario" ? sourceLabel : "Borrador actual",
    });
    updateCharts(currentResult, baselineResult);

    const compareText = document.querySelector("[data-compare-narrative]");
    if (compareText) {
      const rows = buildComparisonRows(currentResult, baselineResult);
      compareText.textContent = summarizeComparison(rows).text;
    }
  } catch {
    contentRoot.hidden = true;
    if (errorRoot) {
      errorRoot.hidden = false;
      errorRoot.innerHTML = `
        <p class="status-note">No se pudo armar el resultado. Revisá que el motor y Ciudad actual estén disponibles.</p>
        <p class="cluster">
          <a class="btn btn--primary" href="./simulador.html">Ir al simulador</a>
        </p>`;
    }
  }
}

function showMissingScenario(errorRoot, contentRoot, scenarioId) {
  if (contentRoot) {
    contentRoot.hidden = true;
    contentRoot.setAttribute("aria-hidden", "true");
  }
  if (!errorRoot) return;
  errorRoot.hidden = false;
  errorRoot.removeAttribute("aria-hidden");
  errorRoot.innerHTML = `
    <div class="container">
      <p class="status-note">No se encontró el escenario propio «${escapeHtml(scenarioId)}». Puede haberse eliminado o el enlace es incorrecto.</p>
      <p class="cluster">
        <a class="btn btn--primary" href="./escenarios.html">Volver a Escenarios</a>
        <a class="btn btn--ghost" href="./resultado.html">Ver resultado del borrador</a>
      </p>
    </div>`;
}

function paintContext(node, lead, label, kind) {
  if (!node) return;
  node.textContent =
    kind === "scenario"
      ? `${lead} Referencia de comparación: Ciudad actual.`
      : `${lead} Fuente: ${label}. Referencia: Ciudad actual.`;
}

function paintScore(node, score) {
  if (!node) return;
  node.textContent = numberFormat.format(score);
}

function paintInterpretation(node, current, baseline) {
  if (!node) return;
  const rows = buildComparisonRows(current, baseline);
  const summary = summarizeComparison(rows);
  const challenges = evaluateFromResults(current, baseline);
  const sameAsBaseline = rows.every((row) => row.change.status === "same");

  const parts = [];
  if (sameAsBaseline) {
    parts.push(
      "La configuración coincide con Ciudad actual: las lecturas son las del punto de partida y los cuatro desafíos siguen pendientes."
    );
  } else {
    parts.push(summary.text);
  }
  parts.push(summarizeChallengeStatus(challenges));
  parts.push(
    `Valoración educativa ${numberFormat.format(current.score)} (Ciudad actual ${numberFormat.format(baseline.score)}).`
  );
  node.textContent = parts.join(" ");
}

function draftLabel(meta) {
  if (meta.origin === ORIGIN.CUSTOM && meta.sourceName) return `Escenario propio «${meta.sourceName}» (borrador)`;
  if (meta.origin === ORIGIN.PRESET && meta.sourceName) return `Preset «${meta.sourceName}» (borrador)`;
  return "Borrador nuevo";
}

function draftInterpretation(meta, current, baseline) {
  const same = Object.keys(baseline.indicators).every(
    (key) => Math.abs(current.indicators[key] - baseline.indicators[key]) < 1e-9
  );
  if (same && meta.origin === ORIGIN.NEW) {
    return "Todavía estás trabajando con Ciudad actual: no hay una configuración personalizada distinta del punto de partida.";
  }
  if (meta.origin === ORIGIN.PRESET) {
    return `Resultado del borrador cargado desde el preset «${meta.sourceName || meta.sourceId}».`;
  }
  if (meta.origin === ORIGIN.CUSTOM) {
    return `Resultado del borrador vinculado al escenario «${meta.sourceName || meta.sourceId}».`;
  }
  return "Resultado del borrador actual del simulador.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
