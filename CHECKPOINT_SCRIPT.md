# Checkpoint video script (about 2 minutes)

**Show `checkpoint.html` at the top of the page.**

Hi, we are Team 23: Don Le, Raynard Taneka, and Krishang Khandelwal. For Project 3, we chose the
CMIP6 climate dataset. We are looking at monthly near-surface air temperature from one NASA GISS
model under three possible emissions scenarios: ssp126, ssp245, and ssp585.

Our current question is: where could high emissions add the most heat compared with a low-emissions
future? We chose this because the difference between the scenarios is easier to understand than three
separate maps.

**Scroll through the six exploratory graphs.**

The first three graphs show January 2020 temperature under the low, middle, and high scenarios. They
look very similar early in the timeline. The fourth graph directly subtracts the low scenario from the
high scenario in 2020, so the difference is still mixed and fairly small. The fifth graph repeats the
comparison in 2100. Here the gap is much larger, especially near the polar regions. The last line chart
shows the global yearly average for all three scenarios, and the paths separate more later in the
century.

**Open the D3 prototype. Move the year slider to 2100 and the month slider to July. Hover on a cell.**

Our current D3 prototype turns that comparison into an interactive heatmap. The year and month sliders
let the reader see how the pattern changes over time. Red cells mean the high-emissions scenario is
warmer, and blue cells mean it is cooler. Hovering gives the cell's location and exact temperature
difference. Next, we plan to improve the geographic reference, add one more useful interaction, and
finish the written design rationale.
