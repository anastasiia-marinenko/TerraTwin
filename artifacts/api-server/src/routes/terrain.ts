import { Router, type IRouter } from "express";
import {
  GetTerrainProfileQueryParams,
  GetTerrainProfileResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const GRID_SIZE = 5;
const SOURCE =
  "Shuttle Radar Topography Mission (SRTM) GL1 V003 via Open Topo Data";
const SOURCE_URL = "https://lpdaac.usgs.gov/products/srtmgl1v003/";
const SOURCE_RESOLUTION_METERS = 30;
const CACHE_TTL_MS = 60 * 60 * 1000;
const PROFILE_CACHE = new Map<
  string,
  { data: ReturnType<typeof GetTerrainProfileResponse.parse>; expiresAt: number }
>();
let lastProviderRequestAt = 0;

type ElevationResponse = {
  status?: string;
  error?: string;
  results?: Array<{ elevation: number | null }>;
};

function sampleCoordinates(
  latitude: number,
  longitude: number,
  spacingMeters: number,
) {
  const latitudeStep = spacingMeters / 111_320;
  const longitudeStep =
    spacingMeters /
    (111_320 * Math.max(0.01, Math.cos((latitude * Math.PI) / 180)));
  const half = Math.floor(GRID_SIZE / 2);

  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, column) => ({
      latitude: latitude + (half - row) * latitudeStep,
      longitude: longitude + (column - half) * longitudeStep,
    })),
  );
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

router.get("/terrain/profile", async (req, res) => {
  let latitude: number;
  let longitude: number;
  let spacingMeters: number;

  try {
    ({ latitude, longitude, spacingMeters = 30 } =
      GetTerrainProfileQueryParams.parse(req.query));
  } catch {
    res.status(400).json({ error: "Enter valid latitude and longitude values." });
    return;
  }

  const cacheKey = `${latitude.toFixed(5)}:${longitude.toFixed(5)}:${spacingMeters}`;
  const cached = PROFILE_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  const delayMs = Math.max(0, 1_050 - (Date.now() - lastProviderRequestAt));
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  lastProviderRequestAt = Date.now();

  const grid = sampleCoordinates(latitude, longitude, spacingMeters);
  const locations = grid
    .flat()
    .map(({ latitude: lat, longitude: lon }) => `${lat},${lon}`)
    .join("|");
  const url = new URL("https://api.opentopodata.org/v1/srtm30m");
  url.searchParams.set("locations", locations);
  url.searchParams.set("interpolation", "bilinear");

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      throw new Error(`Elevation service returned HTTP ${response.status}`);
    }
    const payload = (await response.json()) as ElevationResponse;
    if (payload.status !== "OK" || !Array.isArray(payload.results)) {
      throw new Error(payload.error || "Elevation service returned no samples");
    }

    const elevations = payload.results.map((result) => result.elevation);
    const values = elevations.filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
    if (values.length < 9) {
      res.status(502).json({
        error:
          "SRTM elevation coverage is unavailable or too sparse at this location.",
      });
      return;
    }

    const rows: Array<Array<number | null>> = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      rows.push(elevations.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE));
    }
    const slopes: number[] = [];
    for (let row = 1; row < GRID_SIZE - 1; row += 1) {
      for (let column = 1; column < GRID_SIZE - 1; column += 1) {
        const center = rows[row][column];
        const west = rows[row][column - 1];
        const east = rows[row][column + 1];
        const north = rows[row - 1][column];
        const south = rows[row + 1][column];
        if (
          center === null ||
          west === null ||
          east === null ||
          north === null ||
          south === null
        ) {
          continue;
        }
        const dzdx = (east - west) / (2 * spacingMeters);
        const dzdy = (south - north) / (2 * spacingMeters);
        slopes.push(
          (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI,
        );
      }
    }
    if (!slopes.length) {
      res.status(502).json({
        error:
          "SRTM coverage is too sparse here to calculate a terrain profile.",
      });
      return;
    }

    const averageElevation = mean(values);
    const variance =
      values.reduce(
        (sum, value) => sum + (value - averageElevation) ** 2,
        0,
      ) / values.length;
    const data = GetTerrainProfileResponse.parse({
      latitude,
      longitude,
      spacingMeters,
      gridSize: GRID_SIZE,
      sampleCount: elevations.length,
      validSampleCount: values.length,
      minimumElevationMeters: Math.min(...values),
      maximumElevationMeters: Math.max(...values),
      meanElevationMeters: averageElevation,
      reliefMeters: Math.max(...values) - Math.min(...values),
      elevationStdDevMeters: Math.sqrt(variance),
      meanSlopeDegrees: mean(slopes),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      sourceResolutionMeters: SOURCE_RESOLUTION_METERS,
      sampledAt: new Date().toISOString(),
    });
    PROFILE_CACHE.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    res.json(data);
  } catch (error) {
    logger.warn({ error }, "Unable to calculate SRTM terrain profile");
    res.status(502).json({
      error:
        "The elevation data service is temporarily unavailable. No substitute values were used.",
    });
  }
});

export default router;
