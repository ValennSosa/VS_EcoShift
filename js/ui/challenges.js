/**
 * Render compartido de desafíos (simulador, desafíos, resultado).
 * El estado cumplido/pendiente va en texto accesible, no solo en color.
 */

const numberFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * @param {HTMLElement} container
 * @param {ReturnType<import("../sim/challenges.js").evaluateChallenges>} evaluations
 * @param {{ compact?: boolean, headingId?: string }} [options]
 */
export function renderChallenges(container, evaluations, options = {}) {
  if (!container) return;
  const compact = Boolean(options.compact);
  container.replaceChildren();

  const list = document.createElement(compact ? "ul" : "div");
  list.className = compact ? "challenge-compact-list" : "challenge-list";
  if (options.headingId) list.setAttribute("aria-labelledby", options.headingId);

  for (const item of evaluations) {
    list.append(compact ? buildCompactItem(item) : buildFullArticle(item));
  }

  container.append(list);
}

export function summarizeChallengeStatus(evaluations) {
  const met = evaluations.filter((item) => item.met).length;
  const total = evaluations.length;
  if (met === 0) {
    return `Ningún desafío cumplido (${met} de ${total}).`;
  }
  if (met === total) {
    return `Los ${total} desafíos están cumplidos.`;
  }
  return `${met} de ${total} desafíos cumplidos.`;
}

function buildCompactItem(item) {
  const li = document.createElement("li");
  li.className = `challenge-compact challenge-compact--${item.met ? "met" : "pending"}`;
  li.dataset.challenge = item.id;

  const status = document.createElement("span");
  status.className = "challenge-status";
  status.textContent = item.statusLabel;
  status.setAttribute("aria-label", `Estado: ${item.statusLabel}`);

  const title = document.createElement("span");
  title.className = "challenge-compact__title";
  title.textContent = item.title;

  const metrics = document.createElement("span");
  metrics.className = "challenge-compact__metrics";
  metrics.textContent = formatMetrics(item);

  li.append(status, title, metrics);
  return li;
}

function buildFullArticle(item) {
  const article = document.createElement("article");
  article.className = `challenge challenge--${item.met ? "met" : "pending"}`;
  article.id = item.id;
  article.dataset.challenge = item.id;

  const index = document.createElement("p");
  index.className = "challenge__index";
  index.textContent = item.index;

  const heading = document.createElement("h3");
  heading.textContent = item.title;

  const status = document.createElement("p");
  status.className = "challenge-status";
  status.textContent = item.statusLabel;
  status.setAttribute("aria-label", `Estado: ${item.statusLabel}`);

  const dl = document.createElement("dl");
  dl.className = "definition";

  appendDef(dl, "Condición", item.description);
  appendDef(dl, "Valor actual", formatValue(item));
  appendDef(dl, "Objetivo", formatTarget(item));
  appendDef(dl, "Lectura", item.detail);

  article.append(index, heading, status, dl);
  return article;
}

function appendDef(dl, term, value) {
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  dd.textContent = value;
  dl.append(dt, dd);
}

function formatMetrics(item) {
  return `Actual ${formatValue(item)} · Objetivo ${formatTarget(item)}`;
}

function formatValue(item) {
  if (item.id === "emisiones") {
    const pct =
      item.ratio == null || !Number.isFinite(item.ratio)
        ? "—"
        : `${percentFormat.format(item.ratio * 100)}% de reducción`;
    return `${numberFormat.format(item.value)} (${pct})`;
  }
  return numberFormat.format(item.value);
}

function formatTarget(item) {
  if (item.id === "emisiones") {
    if (item.target == null || !Number.isFinite(item.target)) {
      return "Reducción ≥ 20% (no evaluable con emisiones iniciales ≤ 0)";
    }
    return `Reducción ≥ 20% (emisiones ≤ ${numberFormat.format(item.target)})`;
  }
  return numberFormat.format(item.target);
}
