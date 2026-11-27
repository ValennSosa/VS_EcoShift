import { VARIABLE_KEYS } from "../sim/engine.js";
import { ZONE_DEFINITIONS, calculateZoneStates, getZoneState } from "../sim/zones.js";

const LEVEL_LABELS = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

let root = null;
let panel = null;
let live = null;
let chipBox = null;
let selectedId = null;
let latestStates = null;
let onSelectCallback = null;
let labelResizeObserver = null;

const CITY_VIEWBOX_WIDTH = 920;
const LABEL_SCREEN_PX = 14;

export async function initCity({ stage, panel: panelNode, liveRegion, onSelect }) {
  if (!stage || !panelNode) return null;

  panel = panelNode;
  live = liveRegion || null;
  onSelectCallback = typeof onSelect === "function" ? onSelect : null;

  const response = await fetch("./assets/city/city.svg");
  if (!response.ok) throw new Error("No se pudo cargar la ciudad.");
  const markup = await response.text();
  stage.replaceChildren();

  const frame = document.createElement("div");
  frame.className = "city-canvas-wrap";
  frame.innerHTML = markup;

  const svg = frame.querySelector("svg");
  if (!svg) throw new Error("El SVG de la ciudad es inválido.");

  svg.querySelector("style")?.remove();
  svg.removeAttribute("role");
  svg.removeAttribute("aria-labelledby");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("city-canvas");
  root = svg;

  chipBox = document.createElement("div");
  chipBox.className = "city-zone-chips";
  chipBox.setAttribute("role", "group");
  chipBox.setAttribute("aria-label", "Zonas de la ciudad");

  for (const definition of ZONE_DEFINITIONS) {
    const zone = svg.querySelector(`[data-zone="${definition.id}"]`);
    if (!zone) continue;

    zone.classList.add("city-zone");
    zone.style.cursor = "pointer";
    zone.addEventListener("click", () => selectZone(definition.id));

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "city-zone-chip";
    chip.dataset.zoneTarget = definition.id;
    chip.setAttribute("aria-pressed", "false");
    chip.textContent = definition.name;
    chip.addEventListener("click", () => selectZone(definition.id));
    chipBox.append(chip);
  }

  const caption = document.createElement("p");
  caption.className = "city-stage__caption";
  caption.textContent =
    "Elegí una zona en el mapa o en la lista. La selección no modifica los controles ni el resultado del motor.";

  stage.append(frame, chipBox, caption);
  syncZoneLabelSizes();
  if (typeof ResizeObserver === "function") {
    labelResizeObserver?.disconnect();
    labelResizeObserver = new ResizeObserver(() => syncZoneLabelSizes());
    labelResizeObserver.observe(svg);
  } else {
    window.addEventListener("resize", syncZoneLabelSizes);
  }
  renderPanel(null);
  return { selectZone, updateCity, getSelectedId: () => selectedId };
}

export function updateCity(variables) {
  if (!root) return null;
  latestStates = calculateZoneStates(variables);

  for (const key of VARIABLE_KEYS) {
    root.setAttribute(`data-v-${toKebab(key)}`, latestStates.variableLevels[key]);
  }

  for (const zone of latestStates.zones) {
    const node = root.querySelector(`[data-zone="${zone.id}"]`);
    if (!node) continue;
    node.setAttribute("data-level", zone.level);
  }

  if (selectedId) renderPanel(getZoneState(latestStates, selectedId));
  return latestStates;
}

export function selectZone(zoneId) {
  if (!root || !ZONE_DEFINITIONS.some((zone) => zone.id === zoneId)) return;

  selectedId = zoneId;

  for (const definition of ZONE_DEFINITIONS) {
    const node = root.querySelector(`[data-zone="${definition.id}"]`);
    const chip = chipBox?.querySelector(`[data-zone-target="${definition.id}"]`);
    const active = definition.id === zoneId;
    node?.classList.toggle("is-selected", active);
    if (chip) chip.setAttribute("aria-pressed", String(active));
  }

  const state = latestStates ? getZoneState(latestStates, zoneId) : null;
  renderPanel(state);

  if (live && state) {
    live.textContent = `Zona seleccionada: ${state.name}. Nivel ${LEVEL_LABELS[state.level]}.`;
  }

  onSelectCallback?.(zoneId);
}

function renderPanel(zone) {
  if (!panel) return;

  if (!zone) {
    panel.innerHTML = `
      <p class="panel__label">Zona</p>
      <h2 id="zona-titulo">Explorá la ciudad</h2>
      <p>Seleccioná una zona en el mapa para ver qué variables la afectan y cómo se lee su nivel visual.</p>
      <p class="disclaimer">La selección es solo consulta: no cambia los controles ni el resultado del motor.</p>
    `;
    return;
  }

  const variables = zone.variables
    .map(
      (item) => `
      <li>
        <div class="zone-metric">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${item.value}</span>
        </div>
        <p>Nivel ${escapeHtml(LEVEL_LABELS[item.level])}</p>
      </li>`
    )
    .join("");

  panel.innerHTML = `
    <p class="panel__label">Zona seleccionada</p>
    <h2 id="zona-titulo">${escapeHtml(zone.name)}</h2>
    <p>${escapeHtml(zone.description)}</p>
    <p class="zone-level-pill" data-level="${zone.level}">Nivel visual: ${escapeHtml(LEVEL_LABELS[zone.level])}</p>
    <h3 class="zone-subtitle">Variables que influyen</h3>
    <ul class="quiet-list zone-metrics">${variables}</ul>
    <h3 class="zone-subtitle">Cómo la afectan las decisiones</h3>
    <p>${escapeHtml(zone.effect)}</p>
  `;
}

function syncZoneLabelSizes() {
  if (!root) return;
  const width = root.getBoundingClientRect().width;
  if (!width) return;
  const scale = width / CITY_VIEWBOX_WIDTH;
  const fontSize = Math.max(18, Math.min(34, LABEL_SCREEN_PX / scale));
  const strokeWidth = Math.max(3, Math.min(7, 5 * (28 / fontSize)));
  for (const label of root.querySelectorAll(".zone-label")) {
    label.setAttribute("font-size", fontSize.toFixed(2));
    label.setAttribute("stroke-width", strokeWidth.toFixed(2));
  }
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
