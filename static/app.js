const form = document.getElementById("analyzeForm");
const chart = document.getElementById("chart");
const errorEl = document.getElementById("error");
const metaEl = document.getElementById("meta");

function clearChart() {
  while (chart.firstChild) chart.removeChild(chart.firstChild);
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
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  metaEl.textContent = "";

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
    metaEl.textContent = `Range: ${payload.range_nm[0]}-${payload.range_nm[1]} nm | Selected wavelengths: ${payload.selected_wavelength_count}`;
  } catch (err) {
    errorEl.textContent = String(err);
    clearChart();
  }
});
