/**
 * Gráficos del simulador.
 * Una instancia por canvas; se actualizan desde publish() con resultados del motor.
 */

import Chart from "chart.js/auto";
import { READINGS, buildComparisonRows, summarizeComparison } from "./indicators.js";

const COLORS = {
  ink: "#10241c",
  emerald: "#0e7a58",
  emeraldDeep: "#0c342b",
  lime: "#c6ef4a",
  mineral: "#3e5148",
  baseline: "rgba(62, 81, 72, 0.55)",
  current: "rgba(14, 122, 88, 0.88)",
  grid: "rgba(16, 36, 28, 0.1)",
};

let profileChart = null;
let compareChart = null;
let profileAlt = null;
let compareAlt = null;
let reducedMotion = false;

export function initCharts({ profileCanvas, compareCanvas, profileText, compareText, currentLabel = "Simulación actual" }) {
  // Perfil opcional: la página de resultado puede montar solo la comparación.
  if (!compareCanvas && !profileCanvas) return null;

  profileAlt = profileText || null;
  compareAlt = compareText || null;
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const labels = READINGS.map((reading) => reading.label);
  const animation = reducedMotion ? false : { duration: 280 };

  profileChart = null;
  compareChart = null;

  if (profileCanvas) {
    profileChart = new Chart(profileCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: currentLabel,
            data: READINGS.map(() => 0),
            backgroundColor: COLORS.current,
            borderColor: COLORS.emeraldDeep,
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.72,
          },
        ],
      },
      options: horizontalOptions("Perfil de indicadores de la simulación actual", animation),
    });
  }

  if (compareCanvas) {
    compareChart = new Chart(compareCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Ciudad actual",
            data: READINGS.map(() => 0),
            backgroundColor: COLORS.baseline,
            borderColor: COLORS.mineral,
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.85,
            categoryPercentage: 0.7,
          },
          {
            label: currentLabel,
            data: READINGS.map(() => 0),
            backgroundColor: COLORS.current,
            borderColor: COLORS.emeraldDeep,
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.85,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: horizontalOptions("Comparación entre Ciudad actual y la simulación", animation, true),
    });
  }

  return { updateCharts };
}

export function updateCharts(result, baseline) {
  if ((!profileChart && !compareChart) || !result?.indicators || !baseline?.indicators) return;

  const rows = buildComparisonRows(result, baseline);
  const profileValues = rows.map((row) => Number(row.current.toFixed(1)));
  const baselineValues = rows.map((row) => Number(row.baseline.toFixed(1)));

  if (profileChart) {
    profileChart.data.datasets[0].data = profileValues;
    profileChart.update(reducedMotion ? "none" : undefined);
  }

  if (compareChart) {
    compareChart.data.datasets[0].data = baselineValues;
    compareChart.data.datasets[1].data = profileValues;
    compareChart.update(reducedMotion ? "none" : undefined);
  }

  paintAlternatives(rows, result.score);
}

function paintAlternatives(rows, score) {
  const summary = summarizeComparison(rows);

  if (profileAlt) {
    profileAlt.textContent = rows
      .map((row) => `${row.label}: ${row.displayCurrent}`)
      .concat([`Valoración educativa: ${formatOne(score)}.`])
      .join(". ");
  }

  if (compareAlt) {
    const detail = rows
      .map(
        (row) =>
          `${row.label}: Ciudad actual ${row.displayBaseline}, simulación ${row.displayCurrent} (${row.changeText})`
      )
      .join(". ");
    compareAlt.textContent = `${summary.text} ${detail}`;
  }
}

function horizontalOptions(title, animation, showLegend = false) {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: {
        display: showLegend,
        position: "bottom",
        labels: {
          color: COLORS.ink,
          boxWidth: 12,
          font: { family: '"Source Sans 3", sans-serif', size: 13 },
        },
      },
      title: {
        display: false,
        text: title,
      },
      tooltip: {
        callbacks: {
          label(context) {
            const value = context.parsed.x;
            if (!Number.isFinite(value)) return context.dataset.label;
            return `${context.dataset.label}: ${formatOne(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          color: COLORS.mineral,
          font: { family: '"Source Sans 3", sans-serif', size: 12 },
        },
        grid: { color: COLORS.grid },
        title: {
          display: true,
          text: "Escala 0 a 100",
          color: COLORS.mineral,
          font: { family: '"Source Sans 3", sans-serif', size: 12 },
        },
      },
      y: {
        ticks: {
          color: COLORS.ink,
          font: { family: '"Sora", sans-serif', size: 12, weight: "600" },
        },
        grid: { display: false },
      },
    },
  };
}

function formatOne(value) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
