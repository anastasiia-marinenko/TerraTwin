# TerraTwin — Project Earth2Mars

**NASA Space Apps Challenge 2026
Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars**

TerraTwin is an interactive field atlas for studying terrestrial analogs of lunar and Martian sites. Pick a planetary
target (Shackleton Crater, Malapert Massif, Taurus–Littrow Valley, Jezero Crater, Gale Crater), explore thirteen Earth
candidates on a satellite map, and compare measured terrain statistics across Earth, Moon and Mars.

- **Live app:** http://terratwin-psi.vercel.app/
- **Demo:** https://docs.google.com/presentation/d/e/2PACX-1vTAh9LjXtJLAP9Oyp68gvrzAOpCezXc1LS10lz0KqgPpbVjrQKdQSTsg_0gNmA9i8wJnozK3pVEy7Ib/pub?start=true&loop=true&delayms=3000

## What it does

- Satellite map with Esri World Imagery and NASA GIBS MODIS Terra true colour for a selectable month.
- Live SRTM terrain statistics for each Earth site: elevation, relief, standard deviation, mean slope
  (5 × 5 grid, 30 m spacing, via Open Topo Data).
- Geotagged field photographs with author and license (Wikimedia Commons; NASA Image and Video Library as fallback).
- Cross-world comparison of slope, relief and roughness for Earth vs Moon (LRO LOLA) vs Mars (MGS MOLA), plus a ranking
  of the Earth sites whose terrain statistics are closest to the selected target.
- Every site states how it can support mission rehearsal and where the analogy breaks down.
- When data are unavailable the app says so; it never invents numbers.

## How the comparison works

Slope depends on the measuring baseline, so all three worlds are sampled identically by
[`scripts/terrain-stats/compute_terrain_stats.py`](scripts/terrain-stats/README.md):

1. 5 × 5 grid with 500 m spacing around each point (azimuthal equidistant projection, valid at the poles).
2. Bilinear interpolation of each elevation model: LOLA 118 m (Moon), MOLA 463 m (Mars), SRTM/ASTER 30 m (Earth).
3. Mean slope from central differences over a 1 km baseline, local relief, and elevation standard deviation.
4. Results are written to `artifacts/terra-lunar-atlas/src/data/terrain-stats.json`, which the app reads.

The Earth-site ranking is a distance in a three-metric space (slope, relief, roughness). Each metric is log-transformed
and scaled by its spread across the Earth sites. Absolute elevation is not compared because the worlds use different
zero levels. The comparison covers terrain geometry of 2 km patches only; it is **not** a measure of geology, gravity,
vacuum, atmosphere, radiation or mission suitability.

## Repository layout

| Path                                                  | Purpose                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `artifacts/terra-lunar-atlas`                         | React + Vite frontend                                      |
| `artifacts/api-server`                                | Express API (terrain profile, health check)                |
| `api/index.ts`                                        | Vercel Function entry that serves the Express app          |
| `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | OpenAPI spec, Zod schemas, generated client                |
| `scripts/terrain-stats`                               | Offline Python pipeline for the Moon/Mars/Earth comparison |

## Run locally

```bash
pnpm install
pnpm --filter @workspace/terra-lunar-atlas dev            # frontend
PORT=8080 pnpm --filter @workspace/api-server dev         # API
```

The Vercel deployment serves the frontend and the API together (see `vercel.json`).

## Data sources

Used by the app: SRTM GL1 V003 (via Open Topo Data), NASA GIBS / Worldview, NASA Image and Video Library,
LRO LOLA and MGS MOLA elevation models (USGS Astrogeology), ASTER GDEM v3 (fallback), Wikimedia Commons,
Esri World Imagery, Leaflet.

Listed on the in-app Method page as reference catalogs and **not ingested**: NASA PDS, LRO Diviner, Copernicus,
ESA Open Science Catalog, CSA RADARSAT / RCM, JAXA G-Portal.
