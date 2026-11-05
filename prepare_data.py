"""Make the smaller files used by the Project 3 website.

The original CMIP6 files are too large to load in a browser, so this script
keeps one NASA model and makes a lower-resolution version for D3.
"""

from pathlib import Path

import fsspec
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xarray as xr


MODEL_PATH = (
    "https://storage.googleapis.com/cmip6/CMIP6/ScenarioMIP/NASA-GISS/"
    "GISS-E2-1-G/{scenario}/r1i1p3f1/Amon/tas/gn/v20200115/"
)
SCENARIOS = ["ssp126", "ssp245", "ssp585"]
MAP_YEARS = [2020, 2040, 2060, 2080, 2100]


def open_scenario(scenario):
    path = MODEL_PATH.format(scenario=scenario)
    return xr.open_zarr(fsspec.get_mapper(path), consolidated=True)


def make_heatmap_data(datasets):
    rows = []
    low = datasets["ssp126"].tas
    high = datasets["ssp585"].tas

    for year in MAP_YEARS:
        for month in range(1, 13):
            date = f"{year}-{month:02d}"
            difference = (high.sel(time=date) - low.sel(time=date)).squeeze()
            difference = difference.coarsen(lat=2, lon=2, boundary="trim").mean().load()

            frame = difference.to_dataframe(name="difference_c").reset_index()
            frame["year"] = year
            frame["month"] = month
            rows.append(frame[["year", "month", "lat", "lon", "difference_c"]])

    return pd.concat(rows, ignore_index=True)


def make_global_data(datasets):
    rows = []

    for scenario, dataset in datasets.items():
        weights = np.cos(np.deg2rad(dataset.lat))
        yearly = (
            dataset.tas
            .sel(time=slice("2020", "2100"))
            .weighted(weights)
            .mean(("lat", "lon"))
            .groupby("time.year")
            .mean()
            .load()
        )

        for year, kelvin in zip(yearly.year.values, yearly.values):
            rows.append({
                "year": int(year),
                "scenario": scenario,
                "temperature_c": float(kelvin - 273.15),
            })

    return pd.DataFrame(rows)


def save_exploratory_graphs(datasets, global_data):
    output = Path("checkpoint")
    output.mkdir(exist_ok=True)

    for scenario in SCENARIOS:
        values = datasets[scenario].tas.sel(time="2020-01").squeeze() - 273.15
        fig, ax = plt.subplots(figsize=(8, 4))
        values.plot(ax=ax, cmap="coolwarm", vmin=-45, vmax=35)
        ax.set_title(f"January 2020 near-surface temperature: {scenario}")
        fig.tight_layout()
        fig.savefig(output / f"temperature-{scenario}.png", dpi=130)
        plt.close(fig)

    for year in [2020, 2100]:
        high = datasets["ssp585"].tas.sel(time=f"{year}-01").squeeze()
        low = datasets["ssp126"].tas.sel(time=f"{year}-01").squeeze()
        difference = high - low

        fig, ax = plt.subplots(figsize=(8, 4))
        difference.plot(ax=ax, cmap="RdBu_r", center=0)
        ax.set_title(f"January {year}: SSP5-8.5 minus SSP1-2.6")
        fig.tight_layout()
        fig.savefig(output / f"difference-{year}.png", dpi=130)
        plt.close(fig)

    fig, ax = plt.subplots(figsize=(8, 4))
    for scenario, group in global_data.groupby("scenario"):
        ax.plot(group.year, group.temperature_c, label=scenario)
    ax.set(title="Projected global temperature by scenario", xlabel="Year", ylabel="Temperature (C)")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(output / "global-trends.png", dpi=130)
    plt.close(fig)


def main():
    Path("data").mkdir(exist_ok=True)
    datasets = {scenario: open_scenario(scenario) for scenario in SCENARIOS}

    heatmap_data = make_heatmap_data(datasets)
    heatmap_data.to_csv("data/temperature-difference.csv", index=False)

    global_data = make_global_data(datasets)
    global_data.to_csv("data/global-temperature.csv", index=False)

    save_exploratory_graphs(datasets, global_data)
    print(f"Saved {len(heatmap_data):,} heatmap rows and {len(global_data):,} yearly rows")


if __name__ == "__main__":
    main()
