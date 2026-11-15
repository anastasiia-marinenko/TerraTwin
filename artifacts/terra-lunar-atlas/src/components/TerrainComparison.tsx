import { ExternalLink, Scale } from 'lucide-react';
import type { EarthSite, TargetSite } from '@/data/analogs';
import { earthSites } from '@/data/analogs';
import { metrics, rankEarthSites, terrainStats, type BodyStats } from '@/lib/terrainCompare';
import './terrain-comparison.css';

const fmt = (value: number, places: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: places }).format(value);

type Props = { site: EarthSite; target: TargetSite; onSelectSite: (id: string) => void };

export default function TerrainComparison({ site, target, onSelectSite }: Props) {
  const world = target.body === 'moon' ? 'Moon' : 'Mars';
  const heading = <div className="tt-cmp-heading"><div className="tt-kicker"><Scale size={12} /> EARTH vs {world.toUpperCase()} · MEASURED TERRAIN STATISTICS</div><h3>{site.name} compared with {target.name}</h3></div>;

  if (terrainStats.status !== 'computed') {
    return <section className="tt-cmp" aria-label="Earth and planetary terrain comparison">
      {heading}
      <div className="tt-cmp-empty" role="status">
        <strong>Moon and Mars statistics have not been computed yet.</strong>
        <span>Run <code>scripts/terrain-stats/compute_terrain_stats.py</code> (see its README). It reads NASA LOLA (Moon) and MOLA (Mars) elevation models and the same SRTM source used here for Earth, then writes <code>src/data/terrain-stats.json</code>. Until then no cross-world numbers are shown and none are estimated.</span>
      </div>
    </section>;
  }

  const earthStats = terrainStats.earth[site.id] ?? null;
  const targetStats = terrainStats.targets[target.id] ?? null;
  const spacing = terrainStats.spacingMeters ?? 0;

  const missing = (!earthStats && `No usable Earth elevation samples were found for ${site.name} at this baseline.`) || (!targetStats && `No usable ${world} elevation samples were found for ${target.name}.`) || '';

  const ranking = targetStats ? rankEarthSites(targetStats, terrainStats.earth).slice(0, 5) : [];

  const row = (m: (typeof metrics)[number], e: BodyStats, t: BodyStats) => {
    const ev = e[m.key];
    const tv = t[m.key];
    const max = Math.max(ev, tv, 1e-9);
    const ratio = ev > 0 && tv > 0 ? tv / ev : null;
    return <div className="tt-cmp-row" key={m.key}>
      <div className="tt-cmp-label">{m.label}</div>
      <div className="tt-cmp-bars">
        <div className="tt-cmp-bar"><span className="tt-cmp-bar-name">Earth</span><span className="tt-cmp-track"><span className="is-earth" style={{ width: `${(ev / max) * 100}%` }} /></span><strong>{fmt(ev, m.places)}{m.unit}</strong></div>
        <div className="tt-cmp-bar"><span className="tt-cmp-bar-name">{world}</span><span className="tt-cmp-track"><span className="is-target" style={{ width: `${(tv / max) * 100}%` }} /></span><strong>{fmt(tv, m.places)}{m.unit}</strong></div>
      </div>
      <div className="tt-cmp-ratio">{ratio === null ? '—' : `${world} ≈ ${fmt(ratio, ratio < 10 ? 2 : 0)}× Earth`}</div>
    </div>;
  };

  return <section className="tt-cmp" aria-label="Earth and planetary terrain comparison">
    {heading}
    {missing ? <div className="tt-cmp-empty" role="status"><strong>Comparison unavailable</strong><span>{missing} No values are estimated.</span></div> : earthStats && targetStats && <>
      <p className="tt-cmp-lede">Same method for both worlds: a {terrainStats.gridSize} × {terrainStats.gridSize} patch with {fmt(spacing, 0)} m spacing (slope measured over a {fmt(spacing * 2, 0)} m baseline). Elevation itself is not compared because each world uses a different zero level.</p>
      <div className="tt-cmp-table">{metrics.map((m) => row(m, earthStats, targetStats))}</div>
      <div className="tt-cmp-sources">
        <a href={earthStats.datasetUrl} target="_blank" rel="noreferrer">Earth: {earthStats.dataset} <ExternalLink size={11} /></a>
        <a href={targetStats.datasetUrl} target="_blank" rel="noreferrer">{world}: {targetStats.dataset} <ExternalLink size={11} /></a>
      </div>
      {ranking.length > 0 && <div className="tt-cmp-rank">
        <div className="tt-kicker">EARTH SITES WITH THE CLOSEST TERRAIN STATISTICS TO {target.name.toUpperCase()}</div>
        <ol>{ranking.map((r, index) => {
          const s = earthSites.find((item) => item.id === r.id);
          if (!s) return null;
          return <li key={r.id}><button type="button" onClick={() => onSelectSite(r.id)} aria-pressed={r.id === site.id} data-testid={`button-closest-${r.id}`}><span className="tt-cmp-rank-n">{index + 1}</span><span className="tt-cmp-rank-name">{s.name}<small>{s.country}</small></span><span className="tt-cmp-rank-d">distance {fmt(r.distance, 2)}</span></button></li>;
        })}</ol>
        <p className="tt-cmp-note">Distance combines slope, relief and roughness (each on a log scale, scaled by the spread across the Earth sites); lower means closer numbers. It compares {fmt(spacing * 4, 0)} m patches only. It does not measure geology, gravity, dust, atmosphere or mission suitability.</p>
      </div>}
    </>}
    <p className="tt-cmp-foot">Computed {terrainStats.generatedAt ? new Date(terrainStats.generatedAt).toLocaleDateString('en-GB') : ''} · {terrainStats.method}</p>
  </section>;
}
