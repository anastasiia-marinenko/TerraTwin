// Порівняння рельєфу Землі, Місяця й Марса за статистиками з terrain-stats.json.
// Файл генерує scripts/terrain-stats/compute_terrain_stats.py (усі тіла — однакова методика й крок сітки).
import rawStats from '@/data/terrain-stats.json';

export type BodyStats = {
  validSamples: number;
  meanElevationMeters: number;
  reliefMeters: number;
  elevationStdDevMeters: number;
  meanSlopeDegrees: number;
  dataset: string;
  datasetUrl: string;
  nativeResolutionMeters: number;
};

export type TerrainStatsFile = {
  status: 'computed' | 'not_computed';
  generatedAt?: string;
  spacingMeters?: number;
  gridSize?: number;
  method?: string;
  targets: Record<string, BodyStats | null>;
  earth: Record<string, BodyStats | null>;
};

export const terrainStats = rawStats as unknown as TerrainStatsFile;

export type MetricKey = 'meanSlopeDegrees' | 'reliefMeters' | 'elevationStdDevMeters';

// Абсолютна висота не порівнюється: у Землі, Місяця й Марса різні нульові рівні (датуми).
export const metrics: { key: MetricKey; label: string; unit: string; eps: number; places: number }[] = [
  { key: 'meanSlopeDegrees', label: 'Mean slope', unit: '°', eps: 0.05, places: 2 },
  { key: 'reliefMeters', label: 'Local relief', unit: ' m', eps: 1, places: 1 },
  { key: 'elevationStdDevMeters', label: 'Roughness (elevation std. dev.)', unit: ' m', eps: 0.5, places: 1 },
];

const transform = (value: number, eps: number) => Math.log(value + eps);

function spread(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return sd > 1e-9 ? sd : 1;
}

export type RankedSite = { id: string; distance: number };

/**
 * Відстань між земним майданчиком і ціллю у просторі трьох показників (нахил, перепад, шорсткість).
 * Кожен показник логарифмується (значення різняться на порядки) і ділиться на розкид між усіма
 * земними майданчиками, тому жоден показник не домінує. Менше значення = ближчі статистики.
 * Це відстань між виміряними числами, а не оцінка придатності майданчика.
 */
export function rankEarthSites(target: BodyStats, earth: Record<string, BodyStats | null>): RankedSite[] {
  const entries = Object.entries(earth).filter((entry): entry is [string, BodyStats] => Boolean(entry[1]));
  if (entries.length < 3) return [];
  const sds = metrics.map((m) => spread(entries.map(([, s]) => transform(s[m.key], m.eps))));
  return entries
    .map(([id, s]) => {
      const sq = metrics.map((m, i) => ((transform(s[m.key], m.eps) - transform(target[m.key], m.eps)) / sds[i]) ** 2);
      return { id, distance: Math.sqrt(sq.reduce((a, b) => a + b, 0) / metrics.length) };
    })
    .sort((a, b) => a.distance - b.distance);
}
