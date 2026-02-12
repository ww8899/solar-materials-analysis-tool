const form = document.getElementById("analyzeForm");
const chart = document.getElementById("chart");
const errorEl = document.getElementById("error");
const metaEl = document.getElementById("meta");
const cursorValuesEl = document.getElementById("cursorValues");
const exportBtn = document.getElementById("exportBtn");
const curveFitForm = document.getElementById("curveFitForm");
const curveFileInput = document.getElementById("curveFileInput");
const functionTypeSelect = document.getElementById("functionType");
const curveChart = document.getElementById("curveChart");
const curveParamsEl = document.getElementById("curveParams");
const curveErrorEl = document.getElementById("curveError");
const toolTabs = Array.from(document.querySelectorAll("[data-tool-tab]"));
const toolPanels = Array.from(document.querySelectorAll("[data-tool-panel]"));
const toolDescriptionEl = document.getElementById("toolDescription");

let lastPlotData = null;
let curveRawData = null;

function activateTool(toolId) {
  toolTabs.forEach((tab) => {
    const isActive = tab.dataset.toolTab === toolId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  toolPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.toolPanel === toolId);
  });

  if (toolDescriptionEl && toolId === "wavelength-rage") {
    toolDescriptionEl.textContent =
      "Upload an Excel/CSV matrix and plot average intensity vs time for a wavelength range.";
  }
}

toolTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const toolId = tab.dataset.toolTab;
    activateTool(toolId);
    const panel = toolPanels.find((p) => p.dataset.toolPanel === toolId);
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

if (toolTabs.length) {
  activateTool(toolTabs[0].dataset.toolTab);
}

function clearChart() {
  while (chart.firstChild) chart.removeChild(chart.firstChild);
  chart.onmousemove = null;
  chart.onmouseleave = null;
}

function line(x1, y1, x2, y2, color, width = 1) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
  el.setAttribute("x1", x1);
  el.setAttribute("y1", y1);
  el.setAttribute("x2", x2);
  el.setAttribute("y2", y2);
  el.setAttribute("stroke", color);
  el.setAttribute("stroke-width", String(width));
  return el;
}

function text(x, y, value, size = 12) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("font-size", String(size));
  el.setAttribute("fill", "#28453b");
  el.textContent = value;
  return el;
}

function path(d, color) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", color);
  el.setAttribute("stroke-width", "2.2");
  return el;
}

function drawChart(times, intensities) {
  clearChart();

  const width = 900;
  const height = 420;
  const pad = { l: 70, r: 20, t: 20, b: 50 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const iMin = 0;
  const iMax = Math.max(...intensities, 1);

  const x = (t) => pad.l + ((t - tMin) / (tMax - tMin || 1)) * plotW;
  const y = (i) => pad.t + (1 - (i - iMin) / (iMax - iMin || 1)) * plotH;

  chart.appendChild(line(pad.l, pad.t, pad.l, height - pad.b, "#4f6d63", 1.2));
  chart.appendChild(line(pad.l, height - pad.b, width - pad.r, height - pad.b, "#4f6d63", 1.2));

  const ticks = 5;
  for (let k = 0; k <= ticks; k++) {
    const tv = tMin + ((tMax - tMin) * k) / ticks;
    const yv = iMin + ((iMax - iMin) * k) / ticks;

    const tx = x(tv);
    const iy = y(yv);

    chart.appendChild(line(tx, pad.t, tx, height - pad.b, "#d5e2dc", 1));
    chart.appendChild(line(pad.l, iy, width - pad.r, iy, "#d5e2dc", 1));
    chart.appendChild(text(tx - 12, height - pad.b + 18, tv.toFixed(0)));
    chart.appendChild(text(8, iy + 4, yv.toFixed(1)));
  }

  chart.appendChild(text(width / 2 - 30, height - 10, "Time (ns)", 13));
  chart.appendChild(text(8, 14, "Intensity", 13));

  let d = "";
  for (let i = 0; i < times.length; i++) {
    const px = x(times[i]);
    const py = y(intensities[i]);
    d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
  }

  chart.appendChild(path(d, "#0c7a5a"));

  const hoverVLine = line(pad.l, pad.t, pad.l, height - pad.b, "#7ca79a", 1);
  hoverVLine.setAttribute("stroke-dasharray", "4 4");
  hoverVLine.style.visibility = "hidden";
  chart.appendChild(hoverVLine);

  const hoverHLine = line(pad.l, height - pad.b, width - pad.r, height - pad.b, "#7ca79a", 1);
  hoverHLine.setAttribute("stroke-dasharray", "4 4");
  hoverHLine.style.visibility = "hidden";
  chart.appendChild(hoverHLine);

  const hoverPoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  hoverPoint.setAttribute("r", "4.2");
  hoverPoint.setAttribute("fill", "#0c7a5a");
  hoverPoint.setAttribute("stroke", "#ffffff");
  hoverPoint.setAttribute("stroke-width", "1.2");
  hoverPoint.style.visibility = "hidden";
  chart.appendChild(hoverPoint);

  function nearestIndexFromX(svgX) {
    const clampedX = Math.max(pad.l, Math.min(width - pad.r, svgX));
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < times.length; i++) {
      const px = x(times[i]);
      const distance = Math.abs(px - clampedX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  chart.onmousemove = (event) => {
    const rect = chart.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = (event.clientX - rect.left) * scaleX;
    const svgY = (event.clientY - rect.top) * scaleY;

    if (svgX < pad.l || svgX > width - pad.r || svgY < pad.t || svgY > height - pad.b) {
      hoverVLine.style.visibility = "hidden";
      hoverHLine.style.visibility = "hidden";
      hoverPoint.style.visibility = "hidden";
      cursorValuesEl.textContent = "Cursor: move over the chart to inspect values.";
      return;
    }

    const idx = nearestIndexFromX(svgX);
    const tVal = times[idx];
    const iVal = intensities[idx];
    const px = x(tVal);
    const py = y(iVal);

    hoverVLine.setAttribute("x1", px);
    hoverVLine.setAttribute("x2", px);
    hoverHLine.setAttribute("y1", py);
    hoverHLine.setAttribute("y2", py);
    hoverPoint.setAttribute("cx", px);
    hoverPoint.setAttribute("cy", py);

    hoverVLine.style.visibility = "visible";
    hoverHLine.style.visibility = "visible";
    hoverPoint.style.visibility = "visible";

    cursorValuesEl.textContent = `Cursor: x = ${tVal.toFixed(2)} ns, y = ${iVal.toFixed(4)}`;
  };

  chart.onmouseleave = () => {
    hoverVLine.style.visibility = "hidden";
    hoverHLine.style.visibility = "hidden";
    hoverPoint.style.visibility = "hidden";
    cursorValuesEl.textContent = "Cursor: move over the chart to inspect values.";
  };
}

function clearCurveChart() {
  while (curveChart.firstChild) curveChart.removeChild(curveChart.firstChild);
}

function drawCurveFitChart(xData, yData, yFit = null) {
  clearCurveChart();

  const width = 900;
  const height = 420;
  const pad = { l: 70, r: 20, t: 20, b: 50 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  const points = xData.map((xVal, i) => ({
    x: Number(xVal),
    y: Number(yData[i]),
    yFit: yFit ? Number(yFit[i]) : null,
  }));
  points.sort((a, b) => a.x - b.x);

  const xMin = Math.min(...points.map((p) => p.x));
  const xMax = Math.max(...points.map((p) => p.x));
  const allY = yFit ? points.flatMap((p) => [p.y, p.yFit]) : points.map((p) => p.y);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);

  const xScale = (xVal) => pad.l + ((xVal - xMin) / (xMax - xMin || 1)) * plotW;
  const yScale = (yVal) => pad.t + (1 - (yVal - yMin) / (yMax - yMin || 1)) * plotH;

  curveChart.appendChild(line(pad.l, pad.t, pad.l, height - pad.b, "#4f6d63", 1.2));
  curveChart.appendChild(line(pad.l, height - pad.b, width - pad.r, height - pad.b, "#4f6d63", 1.2));

  const ticks = 5;
  for (let k = 0; k <= ticks; k++) {
    const xv = xMin + ((xMax - xMin) * k) / ticks;
    const yv = yMin + ((yMax - yMin) * k) / ticks;
    const px = xScale(xv);
    const py = yScale(yv);

    curveChart.appendChild(line(px, pad.t, px, height - pad.b, "#d5e2dc", 1));
    curveChart.appendChild(line(pad.l, py, width - pad.r, py, "#d5e2dc", 1));
    curveChart.appendChild(text(px - 12, height - pad.b + 18, xv.toFixed(2)));
    curveChart.appendChild(text(8, py + 4, yv.toFixed(2)));
  }

  curveChart.appendChild(text(width / 2 - 30, height - 10, "X", 13));
  curveChart.appendChild(text(8, 14, "Y", 13));

  // Uploaded data in black.
  let dataPath = "";
  points.forEach((p, i) => {
    const px = xScale(p.x);
    const py = yScale(p.y);
    dataPath += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
  });
  curveChart.appendChild(path(dataPath, "#000000"));

  if (yFit) {
    // Fitted function in dotted red.
    let fitPath = "";
    points.forEach((p, i) => {
      const px = xScale(p.x);
      const py = yScale(p.yFit);
      fitPath += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    });
    const fitLine = path(fitPath, "#cf2f2f");
    fitLine.setAttribute("stroke-dasharray", "6 4");
    curveChart.appendChild(fitLine);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  metaEl.textContent = "";
  exportBtn.disabled = true;
  lastPlotData = null;

  const file = document.getElementById("fileInput").files[0];
  const minWl = document.getElementById("minWl").value;
  const maxWl = document.getElementById("maxWl").value;

  if (!file) {
    errorEl.textContent = "Please select a file.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("min_wavelength_nm", minWl);
  formData.append("max_wavelength_nm", maxWl);

  try {
    const response = await fetch("/api/analyze-range", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Analysis failed");
    }

    drawChart(payload.time_ns, payload.avg_intensity);
    lastPlotData = {
      time_ns: payload.time_ns,
      avg_intensity: payload.avg_intensity,
    };
    exportBtn.disabled = false;
    metaEl.textContent = `Range: ${payload.range_nm[0]}-${payload.range_nm[1]} nm | Selected wavelengths: ${payload.selected_wavelength_count}`;
  } catch (err) {
    errorEl.textContent = String(err);
    clearChart();
    cursorValuesEl.textContent = "Cursor: move over the chart to inspect values.";
  }
});

exportBtn.addEventListener("click", async () => {
  errorEl.textContent = "";
  if (!lastPlotData) {
    errorEl.textContent = "Please analyze data first.";
    return;
  }

  try {
    const response = await fetch("/api/export-plot-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastPlotData),
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.detail || "Export failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plot_data.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    errorEl.textContent = String(err);
  }
});

curveFitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  curveErrorEl.textContent = "";
  curveParamsEl.textContent = "Fitting...";
  clearCurveChart();

  const file = curveFileInput.files[0];
  if (!file) {
    curveErrorEl.textContent = "Please select a curve fitting file.";
    curveParamsEl.textContent = "Parameters will appear here after fitting.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("function_type", functionTypeSelect.value);

  try {
    const response = await fetch("/api/curve-fit", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Curve fitting failed");
    }

    const p = payload.parameters || {};
    const paramTokens = Object.entries(p)
      .filter(([, value]) => value != null && Number.isFinite(Number(value)))
      .map(([key, value]) => `${key} = ${Number(value).toFixed(6)}`);
    curveParamsEl.textContent = paramTokens.length
      ? paramTokens.join(", ")
      : "No fitted parameters returned.";

    drawCurveFitChart(payload.x_data, payload.y_data, payload.y_fit);
  } catch (err) {
    curveErrorEl.textContent = String(err);
    curveParamsEl.textContent = "Parameters will appear here after fitting.";
    clearCurveChart();
  }
});

curveFileInput.addEventListener("change", async () => {
  curveErrorEl.textContent = "";
  curveParamsEl.textContent = "Parameters will appear here after fitting.";
  clearCurveChart();
  curveRawData = null;

  const file = curveFileInput.files[0];
  if (!file) {
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/curve-data", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Failed to load curve data");
    }

    curveRawData = payload;
    drawCurveFitChart(payload.x_data, payload.y_data);
  } catch (err) {
    curveErrorEl.textContent = String(err);
    clearCurveChart();
  }
});
