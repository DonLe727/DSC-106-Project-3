# DSC 106 Project 3

## Team

- Don Le
- Raynard Taneka
- Ethan Lam

## Project direction

We are using the CMIP6 dataset to compare projected near-surface temperature under a high-emissions
scenario (SSP5-8.5) and a low-emissions scenario (SSP1-2.6). Our current question is:

**Where could high emissions add the most heat compared with a low-emissions future?**

The first D3 prototype uses a year slider, month slider, and hover details. The browser data comes from
one NASA GISS model and is averaged into a smaller grid so it does not take too long to load.

## Checkpoint

Open `checkpoint.html` to see the team information, dataset summary, six exploratory graphs, and a link
to the current interactive prototype.

## Current team split

- **Don:** dataset research and exploratory notebook
- **Raynard:** web-ready data, first D3 heatmap, checkpoint page, and year animation
- **Ethan:** interaction refinement, final rationale/process write-up, mobile checks, and final video polish

## Work intentionally left for the next teammate

- Decide whether scenario switching would add enough value without making the page too busy.
- Add a clearer land reference or a few annotations for places with the largest changes.
- Finish the design rationale and development-process sections, including each member's hours.
- Test the final page on different screen sizes and help record the final video.

## Files

- `index.html`, `main.js`, `style.css`: interactive visualization
- `checkpoint.html`: checkpoint presentation page
- `CHECKPOINT_SCRIPT.md`: short guide for the checkpoint recording
- `CMIP Draft.ipynb`: original exploration from the first teammate
- `prepare_data.py`: makes the smaller CSV files and exploratory figures
- `data/`: files loaded by D3
