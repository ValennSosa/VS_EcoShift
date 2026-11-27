import { simulate } from "../sim/engine.js";
import { evaluateFromResults } from "../sim/challenges.js";
import { getBaselineVariables, getVariables, initState } from "../state/store.js";
import { renderChallenges, summarizeChallengeStatus } from "../ui/challenges.js";

export async function initChallengesPage() {
  const listRoot = document.querySelector("[data-challenges]");
  const summaryRoot = document.querySelector("[data-challenges-summary]");
  const contextRoot = document.querySelector("[data-challenges-context]");
  if (!listRoot) return;

  try {
    const response = await fetch("./data/presets.json");
    if (!response.ok) throw new Error("presets");
    const presets = (await response.json()).presets || [];
    const baselinePreset = presets.find((item) => item.id === "ciudad-actual");
    if (!baselinePreset) throw new Error("baseline");

    initState(baselinePreset.variables);

    const baselineResult = simulate(getBaselineVariables());
    const currentResult = simulate(getVariables());
    const evaluations = evaluateFromResults(currentResult, baselineResult);

    if (contextRoot) {
      contextRoot.textContent =
        "Los estados se calculan con el borrador actual del simulador (este navegador) y se comparan contra Ciudad actual con precisión completa.";
    }

    if (summaryRoot) {
      summaryRoot.textContent = summarizeChallengeStatus(evaluations);
    }

    renderChallenges(listRoot, evaluations, { headingId: "metas-titulo" });
  } catch {
    listRoot.innerHTML = `<p class="status-note">No se pudieron evaluar los desafíos. Revisá que el motor y Ciudad actual estén disponibles.</p>`;
    if (summaryRoot) summaryRoot.textContent = "";
  }
}
