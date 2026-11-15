#!/usr/bin/env python3
"""
TerraTwin: порівняння рельєфу Землі, Місяця і Марса за ОДНАКОВОЮ методикою.

Що робить скрипт
  1. Бере координати цілей (Місяць, Марс) і земних майданчиків із src/data/analogs.ts.
  2. Для кожної точки будує локальну сітку 5 x 5 з кроком SPACING_M метрів
     (азимутальна рівновіддалена проєкція навколо точки — коректно навіть біля полюсів).
  3. Місяць: висоти LOLA (USGS, 118 м/піксель). Марс: висоти MOLA (USGS, 463 м/піксель).
     Земля: SRTM 30 м через OpenTopoData (запасний варіант — ASTER 30 м).
  4. Рахує ті самі показники, що й сайт: перепад висот, стандартне відхилення
     висот (шорсткість), середній нахил (центральні різниці, база 2 x SPACING_M).
  5. Записує результат у artifacts/terra-lunar-atlas/src/data/terrain-stats.json.

Чому один крок сітки для всіх тіл: нахил залежить від бази вимірювання.
Порівнювати нахил на 30 м (Земля) з нахилом на 463 м (Марс) некоректно.
Тому за замовчуванням ВСІ тіла рахуються з кроком 500 м.

Приклад запуску
  pip install -r requirements.txt
  python compute_terrain_stats.py \
      --moon-dem Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif \
      --mars-dem Mars_MGS_MOLA_DEM_mosaic_global_463m.tif

Файли можна передати і як URL (https://planetarymaps.usgs.gov/mosaic/...tif) —
тоді rasterio читатиме лише потрібні фрагменти, але це повільніше за локальний файл.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import sys
import time
from pathlib import Path

import numpy as np
import requests
import rasterio
from pyproj import CRS, Transformer
from rasterio.windows import Window
from scipy.ndimage import map_coordinates

GRID = 5  # такий самий розмір сітки, як у api-server (GRID_SIZE)
REPO = Path(__file__).resolve().parents[2]
ANALOGS_TS = REPO / "artifacts/terra-lunar-atlas/src/data/analogs.ts"
OUT_JSON = REPO / "artifacts/terra-lunar-atlas/src/data/terrain-stats.json"

MOON_URL = "https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif"
MARS_URL = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
OPENTOPO = "https://api.opentopodata.org/v1/{dataset}"

BODIES = {
    "moon": {
        "label": "Moon",
        "dataset": "LRO LOLA global DEM, 118 m/pixel (USGS Astrogeology)",
        "datasetUrl": "https://astrogeology.usgs.gov/search/map/moon_lro_lola_dem_118m",
        "resolutionMeters": 118,
        "defaultScale": 0.5,   # USGS: значення int16 треба ділити на 2
        "radius": 1737400.0,
    },
    "mars": {
        "label": "Mars",
        "dataset": "MGS MOLA global DEM, 463 m/pixel (USGS Astrogeology)",
        "datasetUrl": "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m",
        "resolutionMeters": 463,
        "defaultScale": 1.0,
        "radius": 3396190.0,
    },
}


# --------------------------------------------------------------------------- #
# Читання analogs.ts (щоб не дублювати координати вручну)
# --------------------------------------------------------------------------- #
def parse_sites(ts_path: Path):
    text = ts_path.read_text(encoding="utf-8")
    targets_block, earth_block = text.split("export const earthSites", 1)
    pat = re.compile(
        r"id:\s*'([^']+)'.*?name:\s*['\"]([^'\"]+)['\"].*?"
        r"latitude:\s*(-?[\d.]+),\s*longitude:\s*(-?[\d.]+)",
        re.S,
    )
    targets, earth = [], []
    for m in pat.finditer(targets_block):
        body = "moon" if m.group(1).startswith("moon-") else "mars"
        targets.append({"id": m.group(1), "name": m.group(2), "body": body,
                        "latitude": float(m.group(3)), "longitude": float(m.group(4))})
    for m in pat.finditer(earth_block):
        earth.append({"id": m.group(1), "name": m.group(2),
                      "latitude": float(m.group(3)), "longitude": float(m.group(4))})
    if not targets or not earth:
        sys.exit(f"Не вдалося прочитати координати з {ts_path}")
    return targets, earth


# --------------------------------------------------------------------------- #
# Сітка 5 x 5 навколо точки (азимутальна рівновіддалена проєкція на сфері)
# --------------------------------------------------------------------------- #
def local_grid_lonlat(lat: float, lon: float, spacing_m: float, radius: float):
    """Повертає масиви lon, lat форми (GRID, GRID): рядок 0 — північ, колонка 0 — захід."""
    inv = Transformer.from_crs(
        CRS.from_proj4(f"+proj=aeqd +lat_0={lat} +lon_0={lon} +R={radius} +units=m +no_defs"),
        CRS.from_proj4(f"+proj=longlat +R={radius} +no_defs"),
        always_xy=True,
    )
    half = GRID // 2
    east = np.array([(c - half) * spacing_m for c in range(GRID)])
    north = np.array([(half - r) * spacing_m for r in range(GRID)])
    ee, nn = np.meshgrid(east, north)
    lons, lats = inv.transform(ee.ravel(), nn.ravel())
    return np.asarray(lons).reshape(GRID, GRID), np.asarray(lats).reshape(GRID, GRID)


# --------------------------------------------------------------------------- #
# Статистика (та сама, що в artifacts/api-server/src/routes/terrain.ts)
# --------------------------------------------------------------------------- #
def terrain_stats(z: np.ndarray, spacing_m: float):
    """z — масив GRID x GRID (NaN = немає даних). Повертає None, якщо даних замало."""
    valid = z[np.isfinite(z)]
    if valid.size < 9:
        return None
    slopes = []
    for r in range(1, GRID - 1):
        for c in range(1, GRID - 1):
            nb = (z[r, c], z[r, c - 1], z[r, c + 1], z[r - 1, c], z[r + 1, c])
            if not all(np.isfinite(v) for v in nb):
                continue
            dzdx = (z[r, c + 1] - z[r, c - 1]) / (2 * spacing_m)
            dzdy = (z[r + 1, c] - z[r - 1, c]) / (2 * spacing_m)
            slopes.append(math.degrees(math.atan(math.hypot(dzdx, dzdy))))
    if not slopes:
        return None
    mean = float(valid.mean())
    return {
        "validSamples": int(valid.size),
        "meanElevationMeters": round(mean, 2),
        "reliefMeters": round(float(valid.max() - valid.min()), 2),
        "elevationStdDevMeters": round(float(np.sqrt(((valid - mean) ** 2).mean())), 2),
        "meanSlopeDegrees": round(float(np.mean(slopes)), 3),
    }


# --------------------------------------------------------------------------- #
# Місяць / Марс: вибірка з GeoTIFF
# --------------------------------------------------------------------------- #
class RasterSampler:
    def __init__(self, path: str, body: str, scale: float | None):
        self.body = body
        self.ds = rasterio.open(path)
        if self.ds.crs is None:
            sys.exit(f"{path}: у GeoTIFF немає системи координат (CRS).")
        meta_scale = self.ds.scales[0] if self.ds.scales else 1.0
        self.scale = BODIES[body]["defaultScale"] if scale is None else scale
        print(f"  [{body}] {Path(path).name}: {self.ds.width}x{self.ds.height}, dtype={self.ds.dtypes[0]}, "
              f"scale у метаданих={meta_scale}, застосовую scale={self.scale}")
        ds_crs = CRS.from_wkt(self.ds.crs.to_wkt())
        geo = ds_crs.geodetic_crs or ds_crs
        self.to_ds = Transformer.from_crs(geo, ds_crs, always_xy=True)
        self.nodata = self.ds.nodata
        self.inv = ~self.ds.transform

    def sample(self, lons: np.ndarray, lats: np.ndarray) -> np.ndarray:
        xs, ys = self.to_ds.transform(lons.ravel(), lats.ravel())
        cols, rows = [], []
        for x, y in zip(xs, ys):
            col, row = self.inv * (x, y)
            cols.append(col - 0.5)  # центр пікселя
            rows.append(row - 0.5)
        cols, rows = np.array(cols), np.array(rows)
        c0, c1 = int(np.floor(cols.min())) - 2, int(np.ceil(cols.max())) + 3
        r0, r1 = int(np.floor(rows.min())) - 2, int(np.ceil(rows.max())) + 3
        c0, r0 = max(c0, 0), max(r0, 0)
        c1, r1 = min(c1, self.ds.width), min(r1, self.ds.height)
        if c1 <= c0 or r1 <= r0:
            return np.full(lons.shape, np.nan)
        win = Window(c0, r0, c1 - c0, r1 - r0)
        arr = self.ds.read(1, window=win).astype("float64")
        if self.nodata is not None:
            arr[arr == self.nodata] = np.nan
        arr = arr * self.scale
        vals = map_coordinates(arr, [rows - r0, cols - c0], order=1, mode="nearest", cval=np.nan)
        return vals.reshape(lons.shape)


# --------------------------------------------------------------------------- #
# Земля: OpenTopoData (SRTM 30 м, запасний варіант ASTER 30 м)
# --------------------------------------------------------------------------- #
def earth_elevations(lons, lats, dataset: str):
    locs = "|".join(f"{la:.6f},{lo:.6f}" for la, lo in zip(lats.ravel(), lons.ravel()))
    r = requests.get(OPENTOPO.format(dataset=dataset),
                     params={"locations": locs, "interpolation": "bilinear"}, timeout=30)
    r.raise_for_status()
    payload = r.json()
    if payload.get("status") != "OK":
        raise RuntimeError(payload.get("error", "OpenTopoData error"))
    z = np.array([np.nan if p["elevation"] is None else p["elevation"] for p in payload["results"]],
                 dtype="float64")
    return z.reshape(lons.shape)


EARTH_RADIUS = 6371008.8
EARTH_DATASETS = [
    ("srtm30m", "SRTM GL1 v003, 30 m (NASA/USGS) via Open Topo Data", "https://lpdaac.usgs.gov/products/srtmgl1v003/"),
    ("aster30m", "ASTER GDEM v3, 30 m (NASA/METI) via Open Topo Data", "https://lpdaac.usgs.gov/products/astgtmv003/"),
]


def earth_site_stats(site, spacing_m):
    lons, lats = local_grid_lonlat(site["latitude"], site["longitude"], spacing_m, EARTH_RADIUS)
    for name, label, url in EARTH_DATASETS:
        time.sleep(1.1)  # публічний API: не більше 1 запиту/с
        try:
            z = earth_elevations(lons, lats, name)
        except Exception as exc:  # noqa: BLE001
            print(f"    {site['id']}: {name} помилка: {exc}")
            continue
        stats = terrain_stats(z, spacing_m)
        if stats:
            stats.update({"dataset": label, "datasetUrl": url})
            return stats
        print(f"    {site['id']}: {name} — замало валідних висот, пробую наступний набір")
    return None


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--moon-dem", default=None, help="шлях або URL до LOLA GeoTIFF (118 м)")
    ap.add_argument("--mars-dem", default=None, help="шлях або URL до MOLA GeoTIFF (463 м)")
    ap.add_argument("--spacing-m", type=float, default=500.0, help="крок сітки в метрах (однаковий для всіх тіл)")
    ap.add_argument("--moon-scale", type=float, default=None, help="множник значень Місяця (за замовчуванням 0.5)")
    ap.add_argument("--mars-scale", type=float, default=None, help="множник значень Марса (за замовчуванням 1.0)")
    ap.add_argument("--skip-earth", action="store_true", help="не звертатися до OpenTopoData")
    ap.add_argument("--out", default=str(OUT_JSON))
    args = ap.parse_args()

    if args.spacing_m < BODIES["mars"]["resolutionMeters"] * 0.9:
        print(f"УВАГА: крок {args.spacing_m} м менший за роздільність MOLA (463 м) — нахили Марса будуть згладжені.")

    targets, earth = parse_sites(ANALOGS_TS)
    print(f"Знайдено {len(targets)} цілей на Місяці/Марсі та {len(earth)} земних майданчиків.")

    samplers = {}
    for body, path in (("moon", args.moon_dem or MOON_URL), ("mars", args.mars_dem or MARS_URL)):
        if any(t["body"] == body for t in targets):
            print(f"Відкриваю DEM для {body}: {path}")
            samplers[body] = RasterSampler(path, body, args.moon_scale if body == "moon" else args.mars_scale)

    out_targets = {}
    for t in targets:
        info = BODIES[t["body"]]
        lons, lats = local_grid_lonlat(t["latitude"], t["longitude"], args.spacing_m, info["radius"])
        z = samplers[t["body"]].sample(lons, lats)
        stats = terrain_stats(z, args.spacing_m)
        print(f"  {t['id']:22s} -> {stats}")
        if stats:
            stats.update({"dataset": info["dataset"], "datasetUrl": info["datasetUrl"],
                          "nativeResolutionMeters": info["resolutionMeters"]})
        out_targets[t["id"]] = stats

    out_earth = {}
    if not args.skip_earth:
        print("Земні майданчики (Open Topo Data):")
        for s in earth:
            stats = earth_site_stats(s, args.spacing_m)
            print(f"  {s['id']:22s} -> {stats}")
            if stats:
                stats["nativeResolutionMeters"] = 30
            out_earth[s["id"]] = stats

    result = {
        "status": "computed",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "spacingMeters": args.spacing_m,
        "gridSize": GRID,
        "method": (f"{GRID}x{GRID} grid with {args.spacing_m:g} m spacing around each point (azimuthal equidistant "
                   "projection); slope from central differences (baseline 2x spacing) in the 9 interior cells; "
                   "grid values by bilinear interpolation of each DEM. Identical method for every body."),
        "targets": out_targets,
        "earth": out_earth,
    }
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nГотово: {args.out}")


if __name__ == "__main__":
    main()
