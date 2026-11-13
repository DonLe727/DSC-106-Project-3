const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const width = 960;
const height = 480;
const margin = {top: 4, right: 4, bottom: 4, left: 4};

const svg = d3.select("#map")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("aria-label", "World grid showing temperature differences");

const x = d3.scaleLinear().domain([-180, 180]).range([margin.left, width - margin.right]);
const y = d3.scaleLinear().domain([90, -90]).range([margin.top, height - margin.bottom]);
const color = d3.scaleDiverging([-12, 0, 12], t => d3.interpolateRdBu(1 - t)).clamp(true);

// Heatmap cells sit below the outlines; the outline layer ignores the pointer so tooltips still work.
const cellLayer = svg.append("g").attr("class", "cells");
const outlineLayer = svg.append("g").attr("class", "outlines");
const selectionBox = svg.append("rect").attr("class", "selection-box").style("display", "none");

// Project lon/lat with the same scales as the cells so the outlines line up exactly.
// The base projection returns plain degrees and cuts shapes that cross the date line.
const degrees = d3.geoEquirectangular().scale(180 / Math.PI).translate([0, 0]);
const toPixels = d3.geoTransform({
  point(lon, negativeLat) {
    this.stream.point(x(lon), y(-negativeLat));
  }
});
const geoPath = d3.geoPath({stream: output => degrees.stream(toPixels.stream(output))});

const tooltip = d3.select("#tooltip");
const outlineToggle = d3.select("#outline-toggle");
const resetButton = d3.select("#reset-zoom");

const fullLon = [-180, 180];
const fullLat = [90, -90];
const minLonSpan = 30; // tightest zoom: 30° of longitude across the map
const yearSlider = d3.select("#year-slider");
const monthSlider = d3.select("#month-slider");
const playButton = d3.select("#play-years");
const animationStatus = d3.select("#animation-status");
const years = [2020, 2040, 2060, 2080, 2100];

let allData = [];
let countryFeatures = [];
let statesByCountry = new Map();
let playbackTimer = null;

function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function stateContains(state, lon, lat) {
  return state.polygons.some(([outer, ...holes]) =>
    ringContains(outer, lon, lat) && !holes.some(hole => ringContains(hole, lon, lat)));
}

// Country and state (where state shapes exist) under the pointer, or "Ocean".
function placeName(event) {
  if (!countryFeatures.length) return "";
  const [px, py] = d3.pointer(event, svg.node());
  const lon = x.invert(px);
  const lat = y.invert(py);
  const country = countryFeatures.find(feature => d3.geoContains(feature, [lon, lat]));
  if (!country) return "Ocean";

  const name = country.properties.name;
  const state = (statesByCountry.get(name) || []).find(s => stateContains(s, lon, lat));
  return state ? `${name}, ${state.name}` : name;
}

function cleanLongitude(lon) {
  return lon > 180 ? lon - 360 : lon;
}

function drawLegend() {
  const legendWidth = 420;
  const legendHeight = 54;
  const legendSvg = d3.select("#legend")
    .append("svg")
    .attr("viewBox", `0 0 ${legendWidth} ${legendHeight}`)
    .style("max-width", `${legendWidth}px`)
    .style("margin", "12px auto 0");

  const gradient = legendSvg.append("defs")
    .append("linearGradient")
    .attr("id", "temperature-gradient");

  d3.range(0, 1.01, .05).forEach(step => {
    gradient.append("stop")
      .attr("offset", `${step * 100}%`)
      .attr("stop-color", color(-12 + step * 24));
  });

  legendSvg.append("rect")
    .attr("x", 25)
    .attr("y", 6)
    .attr("width", 370)
    .attr("height", 14)
    .attr("fill", "url(#temperature-gradient)");

  const legendScale = d3.scaleLinear().domain([-12, 12]).range([25, 395]);
  legendSvg.append("g")
    .attr("transform", "translate(0,20)")
    .call(d3.axisBottom(legendScale).tickValues([-12, -6, 0, 6, 12]).tickFormat(d => `${d}°`))
    .call(g => g.select(".domain").remove());
}

function updateMap() {
  const year = +yearSlider.property("value");
  const month = +monthSlider.property("value");
  const current = allData.filter(d => d.year === year && d.month === month);

  d3.select("#year-value").text(year);
  d3.select("#month-value").text(monthNames[month - 1]);
  d3.select("#chart-title").text(`${monthNames[month - 1]} ${year} temperature difference`);

  cellLayer.selectAll("rect.cell")
    .data(current, d => `${d.lat}-${d.lon}`)
    .join("rect")
    .attr("class", "cell")
    .attr("fill", d => color(d.difference))
    .on("pointermove", (event, d) => {
      const northSouth = d.lat >= 0 ? "N" : "S";
      const lon = cleanLongitude(d.lon);
      const eastWest = lon >= 0 ? "E" : "W";
      const place = placeName(event);
      tooltip
        .style("display", "block")
        .style("left", `${event.clientX + 14}px`)
        .style("top", `${event.clientY + 14}px`)
        .html(
          (place ? `<strong>${place}</strong><br>` : "") +
          `${Math.abs(d.lat).toFixed(1)}°${northSouth}, ${Math.abs(lon).toFixed(1)}°${eastWest}<br>` +
          `High minus low emissions: ${d.difference >= 0 ? "+" : ""}${d.difference.toFixed(2)}°C`
        );
    })
    .on("pointerleave", () => tooltip.style("display", "none"));

  renderView();
}

// Position the cells and outlines for the current x/y domains (the zoom level).
function renderView() {
  cellLayer.selectAll("rect.cell")
    .attr("x", d => x(cleanLongitude(d.lon) - 2.5))
    .attr("y", d => y(d.lat + 2))
    .attr("width", x(5) - x(0) + .2)
    .attr("height", y(-4) - y(0) + .2);

  outlineLayer.selectAll("path").attr("d", geoPath);
}

function zoomTo(lonDomain, latDomain) {
  const zoomed = lonDomain[0] !== fullLon[0] || lonDomain[1] !== fullLon[1];
  resetButton.property("hidden", !zoomed);

  const lonInterpolator = d3.interpolate(x.domain(), lonDomain);
  const latInterpolator = d3.interpolate(y.domain(), latDomain);
  svg.transition().duration(600).tween("zoom", () => t => {
    x.domain(lonInterpolator(t));
    y.domain(latInterpolator(t));
    renderView();
  });
}

// Zoom to a dragged box (in SVG pixels), widened to keep the map's 2:1 shape.
function zoomToBox(x0, y0, x1, y1) {
  const lonCenter = x.invert((x0 + x1) / 2);
  const latCenter = y.invert((y0 + y1) / 2);
  const lonSpan = Math.max(
    x.invert(x1) - x.invert(x0),
    2 * (y.invert(y0) - y.invert(y1)),
    minLonSpan
  );
  const latSpan = lonSpan / 2;
  const west = Math.max(-180, Math.min(180 - lonSpan, lonCenter - lonSpan / 2));
  const north = Math.min(90, Math.max(-90 + latSpan, latCenter + latSpan / 2));
  zoomTo([west, west + lonSpan], [north, north - latSpan]);
}

function setUpDragZoom() {
  let dragStart = null;

  function clampedPointer(event) {
    const [px, py] = d3.pointer(event, svg.node());
    return [
      Math.max(margin.left, Math.min(width - margin.right, px)),
      Math.max(margin.top, Math.min(height - margin.bottom, py))
    ];
  }

  function endDrag() {
    dragStart = null;
    selectionBox.style("display", "none");
  }

  svg
    .on("pointerdown", event => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      event.preventDefault();
      dragStart = clampedPointer(event);
      svg.node().setPointerCapture(event.pointerId);
    })
    .on("pointermove.drag", event => {
      if (!dragStart) return;
      const [px, py] = clampedPointer(event);
      tooltip.style("display", "none");
      selectionBox
        .style("display", null)
        .attr("x", Math.min(dragStart[0], px))
        .attr("y", Math.min(dragStart[1], py))
        .attr("width", Math.abs(px - dragStart[0]))
        .attr("height", Math.abs(py - dragStart[1]));
    })
    .on("pointerup", event => {
      if (!dragStart) return;
      const [px, py] = clampedPointer(event);
      const [sx, sy] = dragStart;
      endDrag();
      // Ignore plain clicks and tiny accidental drags.
      if (Math.abs(px - sx) < 8 || Math.abs(py - sy) < 8) return;
      zoomToBox(Math.min(sx, px), Math.min(sy, py), Math.max(sx, px), Math.max(sy, py));
    })
    .on("pointercancel", endDrag)
    .on("dblclick", () => zoomTo(fullLon, fullLat));

  resetButton.on("click", () => zoomTo(fullLon, fullLat));
}

function updateOutlines() {
  outlineLayer.style("display", outlineToggle.property("checked") ? null : "none");
}

function stopPlayback() {
  if (playbackTimer) clearInterval(playbackTimer);
  playbackTimer = null;
  playButton.attr("aria-pressed", "false").text("▶ Play years");
  animationStatus.text(`Paused at ${yearSlider.property("value")}`);
}

function advanceYear() {
  const current = +yearSlider.property("value");
  const currentIndex = years.indexOf(current);

  if (currentIndex === years.length - 1) {
    stopPlayback();
    return;
  }

  const next = years[currentIndex + 1];
  yearSlider.property("value", next);
  animationStatus.text(`Showing ${next}`);
  updateMap();
}

function togglePlayback() {
  if (playbackTimer) {
    stopPlayback();
    return;
  }

  if (+yearSlider.property("value") === years[years.length - 1]) {
    yearSlider.property("value", years[0]);
    updateMap();
  }

  playButton.attr("aria-pressed", "true").text("❚❚ Pause years");
  animationStatus.text(`Showing ${yearSlider.property("value")}`);
  playbackTimer = setInterval(advanceYear, 1200);
}

async function drawOutlines() {
  const world = await d3.json("data/countries-110m.json");
  const countries = world.objects.countries;
  countryFeatures = topojson.feature(world, countries).features;

  outlineLayer.append("path")
    .attr("class", "border")
    .datum(topojson.mesh(world, countries, (a, b) => a !== b));

  outlineLayer.append("path")
    .attr("class", "coast")
    .datum(topojson.mesh(world, countries, (a, b) => a === b));

  renderView();
}

async function loadStates() {
  const states = await d3.json("data/states-50m.json");
  statesByCountry = d3.group(states, d => d.country);
}

async function start() {
  loadStates().catch(error => console.error(error));
  outlineToggle.on("change", updateOutlines);
  updateOutlines();
  drawOutlines().catch(error => {
    console.error(error);
    d3.select(".toggle").style("display", "none");
  });

  allData = await d3.csv("data/temperature-difference.csv", d => ({
    year: +d.year,
    month: +d.month,
    lat: +d.lat,
    lon: +d.lon,
    difference: +d.difference_c
  }));

  drawLegend();
  updateMap();
  setUpDragZoom();
  playButton.on("click", togglePlayback);
  yearSlider.on("input", () => {
    stopPlayback();
    updateMap();
  });
  monthSlider.on("input", updateMap);
}

start().catch(error => {
  console.error(error);
  d3.select("#map").text("The climate data could not be loaded.");
});
