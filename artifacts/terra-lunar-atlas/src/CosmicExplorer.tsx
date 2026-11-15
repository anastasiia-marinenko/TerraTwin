import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import { Link } from 'wouter';
import 'leaflet/dist/leaflet.css';
import './cosmic-explorer.css';
import { useGetTerrainProfile, getGetTerrainProfileQueryKey } from '@workspace/api-client-react';
import { Activity, Bookmark, Check, ExternalLink, MapPin, RotateCcw, Search, Satellite } from 'lucide-react';
import { earthSites, targets, type EarthSite } from '@/data/analogs';
import FieldPhotographs from '@/components/FieldPhotographs';

const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const esriAttribution = 'Tiles © Esri; sources include Maxar, Earthstar Geographics, and the GIS User Community.';
const nasaAttribution = 'NASA GIBS / NASA Earth Observing System Data and Information System (EOSDIS). MODIS Terra Corrected Reflectance, True Color.';
const storageKey = 'terratwin-field-shortlist';

function readSaved() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && earthSites.some((site) => site.id === id)) : [];
  } catch {
    return [];
  }
}

function format(value: number, places = 1) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: places }).format(value);
}

function SiteProfile({ site }: { site: EarthSite }) {
  const params = useMemo(() => ({ latitude: site.latitude, longitude: site.longitude, spacingMeters: 30 }), [site.latitude, site.longitude]);
  const queryKey = getGetTerrainProfileQueryKey(params);
  const profile = useGetTerrainProfile(params, { query: { queryKey } });
  const rawError = profile.error ? String(profile.error instanceof Error ? profile.error.message : JSON.stringify(profile.error)) : '';
  const unsupported = /coverage|outside|no data|nodata|unsupported/i.test(rawError);

  return <section className="tt-detail" aria-live="polite">
    <div className="tt-detail-top"><div><div className="tt-kicker">Selected Earth field site</div><h2>{site.name}</h2><p className="tt-detail-region">{site.region} · {site.country}</p></div><span className="tt-mono tt-coordinates">{Math.abs(site.latitude).toFixed(2)}°{site.latitude < 0 ? 'S' : 'N'}, {Math.abs(site.longitude).toFixed(2)}°{site.longitude < 0 ? 'W' : 'E'}</span></div>
    <p className="tt-summary">{site.terrain}. <span>{site.classification}.</span></p>
    <a className="tt-street-view" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${site.latitude},${site.longitude}`} target="_blank" rel="noreferrer" data-testid="link-google-maps-360"><ExternalLink size={13} /> Open Google Maps satellite / Street View</a>
    <p className="tt-street-view-note">Google Maps may show satellite imagery or Street View where available. 360-degree coverage is not guaranteed at remote sites.</p>
    <div className="tt-profile-heading"><div><div className="tt-kicker"><Activity size={12} /> SRTM LOCAL TERRAIN PROFILE</div><p>{profile.data ? `${profile.data.gridSize} × ${profile.data.gridSize} neighborhood · ${profile.data.spacingMeters} m sample spacing` : '5 × 5 neighborhood · 30 m sample spacing'} · Earth data only</p></div>{profile.data && <span className="tt-mono">Sampled {new Date(profile.data.sampledAt).toLocaleString()}</span>}</div>
    {profile.isLoading && <div className="tt-profile-state" role="status"><span className="tt-profile-skeleton" /><span>Requesting SRTM elevation samples for this location…</span></div>}
    {profile.isError && <div className={`tt-profile-state is-error${unsupported ? ' is-unsupported' : ''}`} role="alert">
      <strong>{unsupported ? 'SRTM coverage unavailable here' : 'Terrain profile could not be loaded'}</strong>
      <span>{unsupported ? 'The selected coordinates are outside usable SRTM coverage or contain no valid elevation samples. No values are shown.' : rawError || 'The terrain profile service did not return a usable response. No values are estimated.'}</span>
      <button type="button" onClick={() => profile.refetch()} data-testid="button-retry-terrain-profile"><RotateCcw size={13} /> Retry profile</button>
    </div>}
    {profile.data?.validSampleCount === 0 && <div className="tt-profile-state is-error is-unsupported" role="status"><strong>No usable SRTM samples at these coordinates</strong><span>The service returned zero valid elevation samples. Terrain statistics are unavailable; no values are estimated.</span></div>}
    {profile.data && profile.data.validSampleCount > 0 && <div className="tt-measurements">
      {[
        ['Mean elevation', `${format(profile.data.meanElevationMeters)} m`],
        ['Local relief', `${format(profile.data.reliefMeters)} m`],
        ['Mean slope', `${format(profile.data.meanSlopeDegrees)}°`],
        ['Elevation standard deviation', `${format(profile.data.elevationStdDevMeters)} m`],
        ['Minimum elevation', `${format(profile.data.minimumElevationMeters)} m`],
        ['Maximum elevation', `${format(profile.data.maximumElevationMeters)} m`],
      ].map(([label, value]) => <div className="tt-measurement" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      <div className="tt-profile-provenance"><span>{profile.data.validSampleCount} of {profile.data.sampleCount} samples valid · grid {profile.data.gridSize} × {profile.data.gridSize}</span><span>Source: {profile.data.source} · {profile.data.sourceResolutionMeters} m resolution</span><a href={profile.data.sourceUrl} target="_blank" rel="noreferrer">Open data source <ExternalLink size={11} /></a></div>
    </div>}
    <div className="tt-detail-notes"><p><strong>Mission-use context:</strong> {site.missionUse}</p><p><strong>Analogy limit:</strong> {site.breaksDown}</p></div>
    <div className="tt-site-sources"><strong>Site references</strong>{site.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={11} /></a>)}</div>
    <FieldPhotographs site={site} />
  </section>;
}

export default function CosmicExplorer() {
  const params = new URLSearchParams(window.location.search);
  const [targetId, setTargetId] = useState(targets.find((target) => target.id === params.get('target'))?.id ?? targets[0].id);
  const [selectedId, setSelectedId] = useState(earthSites.find((site) => site.id === params.get('site'))?.id ?? earthSites[0].id);
  const [query, setQuery] = useState('');
  const [imagery, setImagery] = useState<'esri' | 'nasa'>('esri');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [shareStatus, setShareStatus] = useState('');
  const [mapError, setMapError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const site = earthSites.find((item) => item.id === selectedId) ?? earthSites[0];
  const target = targets.find((item) => item.id === targetId) ?? targets[0];
  const sites = useMemo(() => earthSites.filter((item) => `${item.name} ${item.region} ${item.country}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const nasaDate = `${selectedMonth}-01`;
  const nasaTiles = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${nasaDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

  useEffect(() => {
    if (!host.current) return;
    const map = L.map(host.current, { zoomControl: false, attributionControl: false, worldCopyJump: true }).setView([site.latitude, site.longitude], 4);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    mapRef.current = map;
    map.on('tileerror', () => setMapError('Satellite tiles could not be loaded. Check the connection or select another imagery source.'));
    window.requestAnimationFrame(() => setMapLoaded(true));
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(host.current);
    return () => {
      resize.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      tileRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    setMapError('');
    const layer = L.tileLayer(imagery === 'esri' ? esriUrl : nasaTiles, {
      maxZoom: imagery === 'esri' ? 19 : 9,
      minZoom: 1,
      attribution: imagery === 'esri' ? esriAttribution : nasaAttribution,
      crossOrigin: true,
    }).addTo(map);
    tileRef.current = layer;
    return () => { layer.remove(); };
  }, [imagery, nasaTiles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = sites.map((item) => {
      const icon = L.divIcon({
        className: 'tt-leaflet-marker-shell',
        html: `<button class="tt-map-marker${item.id === site.id ? ' is-selected' : ''}" aria-label="Select ${item.name}" aria-pressed="${item.id === site.id}"><span aria-hidden="true"></span></button>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      });
      return L.marker([item.latitude, item.longitude], { icon, title: item.name })
        .addTo(map)
        .on('click', () => selectSite(item, true));
    });
  }, [sites, site.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([site.latitude, site.longitude], Math.max(map.getZoom(), 6), { duration: 0.8 });
    const paramsNow = new URLSearchParams(window.location.search);
    paramsNow.set('target', targetId);
    paramsNow.set('site', site.id);
    window.history.replaceState({}, '', `${window.location.pathname}?${paramsNow.toString()}`);
  }, [site.id, site.latitude, site.longitude, targetId]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Saved notes still work for this session. */ }
    window.dispatchEvent(new Event('terratwin-shortlist-change'));
  }, [saved]);

  function selectSite(next: EarthSite, zoom = false) {
    setSelectedId(next.id);
    if (zoom) mapRef.current?.flyTo([next.latitude, next.longitude], Math.max(mapRef.current.getZoom(), 7), { duration: 0.8 });
  }

  function toggleSaved() {
    setSaved((items) => items.includes(site.id) ? items.filter((id) => id !== site.id) : [...items, site.id]);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('Link copied');
    } catch {
      const input = document.createElement('textarea');
      input.value = window.location.href;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      setShareStatus(document.execCommand('copy') ? 'Link copied' : 'Copy unavailable');
      input.remove();
    }
    window.setTimeout(() => setShareStatus(''), 2200);
  }

  return <div className="tt-cosmic">
    <div className="tt-shell">
      <header className="tt-topbar"><Link href="/" className="tt-brand" aria-label="Terra Lunar Atlas mission home"><span className="tt-brand-mark"><Satellite size={18} /></span><span><span className="tt-brand-name">Terra Lunar Atlas</span><span className="tt-brand-sub">Earth field explorer</span></span></Link><div className="tt-status"><span className="tt-status-dot" /> SRTM request · live status shown below</div><button type="button" className="tt-share" onClick={share} data-testid="button-share-comparison">{shareStatus || 'Share view'}</button></header>
      <main id="mission">
        <section className="tt-intro"><div><div className="tt-eyebrow">Field exploration · evidence before analogy</div><h1 className="tt-title">Explore Earth.<br /><em>Keep worlds distinct.</em></h1><p className="tt-intro-copy">Inspect candidate field settings, map their real locations, and request local SRTM terrain statistics. Earth measurements describe Earth only; they do not validate a match to the Moon or Mars.</p></div><aside className="tt-brief"><div className="tt-brief-label">Planetary context</div><p>{target.name}<br /><span>{target.region} · {target.body === 'moon' ? 'Moon' : 'Mars'}</span></p><select aria-label="Choose planetary target" value={targetId} onChange={(event) => setTargetId(event.target.value)} data-testid="select-target">{targets.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.body === 'moon' ? 'Moon' : 'Mars'}</option>)}</select><a href={target.sources[0].url} target="_blank" rel="noreferrer">{target.sources[0].label} <ExternalLink size={12} /></a></aside></section>
        <section className="tt-workspace">
          <div className="tt-map-column" data-tour="explorer-map">
            <div className="tt-map-head"><div><div className="tt-kicker">EARTH / CANDIDATE CONTEXT</div><h2>Field sites, on the ground</h2></div><div className="tt-map-actions"><button type="button" className="tt-view-button" aria-pressed={imagery === 'esri'} onClick={() => setImagery('esri')} data-testid="button-imagery-esri">Esri World Imagery</button><button type="button" className="tt-view-button" aria-pressed={imagery === 'nasa'} onClick={() => setImagery('nasa')} data-testid="button-imagery-nasa">NASA Worldview</button></div></div>
            <div className="tt-map-frame"><div ref={host} className="tt-map" role="application" aria-label="Interactive satellite map of Earth field sites" data-testid="map-canvas" /><div className="tt-map-badge">{imagery === 'nasa' ? `NASA MODIS Terra · ${nasaDate}` : 'Esri World Imagery · satellite context'}</div><div className="tt-map-attribution">{imagery === 'nasa' ? nasaAttribution : esriAttribution}</div>{!mapLoaded && <div className="tt-map-loading" role="status">Loading map and satellite tiles…</div>}{mapError && <div className="tt-map-error" role="alert"><span>{mapError}</span><button type="button" onClick={() => { setMapError(''); const map = mapRef.current; if (!map) return; tileRef.current?.remove(); const layer = L.tileLayer(imagery === 'esri' ? esriUrl : nasaTiles, { maxZoom: imagery === 'esri' ? 19 : 9, attribution: imagery === 'esri' ? esriAttribution : nasaAttribution, crossOrigin: true }).addTo(map); tileRef.current = layer; }}>Retry tiles</button></div>}</div>
            <div className="tt-map-foot"><label htmlFor="worldview-date">NASA Worldview date</label><input id="worldview-date" type="month" value={selectedMonth} max={new Date().toISOString().slice(0, 7)} onChange={(event) => setSelectedMonth(event.target.value)} data-testid="input-worldview-month" /><span>Monthly imagery date affects NASA tiles only; it does not date ground photographs.</span></div>
            <SiteProfile site={site} />
            <div className="tt-shortlist"><Bookmark size={15} /><span>Field notes</span><strong>{saved.length} saved</strong><button type="button" onClick={toggleSaved} data-testid="button-shortlist-selected">{saved.includes(site.id) ? <><Check size={13} /> Remove saved site</> : 'Save selected site'}</button></div>
          </div>
          <aside className="tt-explorer-rail"><div className="tt-panel-title"><div><div className="tt-kicker">EARTH FIELD SITES</div><h2>Candidate places</h2></div><span className="tt-count">{String(sites.length).padStart(2, '0')}</span></div><p className="tt-ranking-caveat">These places are candidate context, not a ranked list. Analogue descriptions refer to documented field use or a possible research context; no Earth-only statistic establishes planetary similarity.</p><div className="tt-search-wrap"><Search size={14} /><input className="tt-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sites or regions" aria-label="Search Earth field sites" data-testid="input-search-sites" /></div><div className="tt-rank-list" role="list" aria-label="Earth field sites">{sites.map((item) => <button key={item.id} type="button" role="listitem" className="tt-rank-card" aria-pressed={item.id === site.id} onClick={() => selectSite(item, true)} data-testid={`button-select-site-${item.id}`}><span className="tt-rank-top"><MapPin size={14} /><span className="tt-rank-name">{item.name}</span></span><span className="tt-rank-sub">{item.region} · {item.country}</span><span className="tt-site-classification">{item.classification}</span></button>)}{sites.length === 0 && <div className="tt-empty"><strong>No sites found</strong>Try a different name or region.</div>}</div><section className="tt-side-card"><div className="tt-kicker">READ THE COMPARISON CAREFULLY</div><h3>Analogy is a question, not a score.</h3><p>Earth field sites can help teams rehearse mobility, instruments, observation, and procedures. They cannot reproduce lunar or Martian conditions.</p><p><Link href="/method">Read the data and limits <ExternalLink size={12} /></Link></p></section><section className="tt-side-card tt-side-card--warning"><div className="tt-kicker">CANDIDATE CONTEXT</div><h3>{site.name}</h3><p>{site.terrain}</p><h4>{target.name} · {target.body === 'moon' ? 'Moon' : 'Mars'}</h4><p>{target.summary}</p><p className="tt-context-label">Consider how the mission task, scale, material, gravity, and atmosphere differ. This juxtaposition is descriptive, not a measured match.</p><div className="tt-site-sources">{target.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={11} /></a>)}{site.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label} <ExternalLink size={11} /></a>)}</div></section></aside>
        </section>
        <footer className="tt-footer"><span>Terra Lunar Atlas · evidence and analogy limits visible</span><button type="button" className="tt-footer-share" onClick={share}>{shareStatus || 'Share this view'}</button></footer>
      </main>
    </div>
  </div>;
}
