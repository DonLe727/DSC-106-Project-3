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

const tooltip = d3.select("#tooltip");
const yearSlider = d3.select("#year-slider");
const monthSlider = d3.select("#month-slider");

let allData = [];

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

  svg.selectAll("rect.cell")
    .data(current, d => `${d.lat}-${d.lon}`)
    .join("rect")
    .attr("class", "cell")
    .attr("x", d => x(cleanLongitude(d.lon) - 2.5))
    .attr("y", d => y(d.lat + 2))
    .attr("width", x(5) - x(0) + .2)
    .attr("height", y(-4) - y(0) + .2)
    .attr("fill", d => color(d.difference))
    .on("pointermove", (event, d) => {
      const northSouth = d.lat >= 0 ? "N" : "S";
      const lon = cleanLongitude(d.lon);
      const eastWest = lon >= 0 ? "E" : "W";
      tooltip
        .style("display", "block")
        .style("left", `${event.clientX + 14}px`)
        .style("top", `${event.clientY + 14}px`)
        .html(
          `<strong>${Math.abs(d.lat).toFixed(1)}°${northSouth}, ${Math.abs(lon).toFixed(1)}°${eastWest}</strong><br>` +
          `High minus low emissions: ${d.difference >= 0 ? "+" : ""}${d.difference.toFixed(2)}°C`
        );
    })
    .on("pointerleave", () => tooltip.style("display", "none"));
}

async function start() {
  allData = await d3.csv("data/temperature-difference.csv", d => ({
    year: +d.year,
    month: +d.month,
    lat: +d.lat,
    lon: +d.lon,
    difference: +d.difference_c
  }));

  drawLegend();
  updateMap();
  yearSlider.on("input", updateMap);
  monthSlider.on("input", updateMap);
}

start().catch(error => {
  console.error(error);
  d3.select("#map").text("The climate data could not be loaded.");
});
