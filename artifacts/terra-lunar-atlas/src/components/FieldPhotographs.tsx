import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, ExternalLink, ImageOff } from 'lucide-react';
import type { EarthSite } from '@/data/analogs';

type CommonsPhoto = {
  source: 'commons';
  title: string;
  imageUrl: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  latitude: number;
  longitude: number;
};

type NasaPhoto = {
  source: 'nasa';
  title: string;
  imageUrl: string;
  sourceUrl: string;
  author: string;
};

type FieldPhoto = CommonsPhoto | NasaPhoto;

type CommonsPage = {
  title?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

type NasaItem = {
  data?: Array<{
    title?: string;
    nasa_id?: string;
    description?: string;
    photographer?: string;
    secondary_creator?: string;
    center?: string;
    keywords?: string[];
  }>;
  links?: Array<{ href?: string; rel?: string }>;
};

function plainText(value?: string) {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ').replace(/\s+/g, ' ').trim();
}

const genericLocationTerms = new Set([
  'desert', 'valley', 'valleys', 'highlands', 'highland', 'plateau', 'crater',
  'lake', 'island', 'basin', 'volcano', 'depression', 'southwestern', 'southern',
  'northern', 'central', 'western', 'eastern', 'land', 'united', 'states',
]);

function locationTerms(site: EarthSite) {
  return [...new Set(`${site.name} ${site.region}`.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((term) => term.length > 3 && !genericLocationTerms.has(term));
}

async function getCommonsPhotos(site: EarthSite, compact: boolean, signal: AbortSignal): Promise<CommonsPhoto[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'geosearch',
    ggsnamespace: '6',
    ggscoord: `${site.latitude}|${site.longitude}`,
    ggsradius: '10000',
    ggslimit: compact ? '4' : '8',
    prop: 'coordinates|imageinfo',
    colimit: '1',
    iiprop: 'url|extmetadata',
    iiurlwidth: compact ? '1200' : '800',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('The Commons service did not respond.');
  const result = await response.json() as { query?: { pages?: Record<string, CommonsPage> } };
  return Object.values(result.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0];
    const coordinates = page.coordinates?.[0];
    if (!info || !coordinates || !(info.thumburl || info.url) || !info.descriptionurl) return [];
    const meta = info.extmetadata ?? {};
    const author = plainText(meta.Artist?.value) || plainText(meta.Credit?.value) || 'Author not listed';
    const license = plainText(meta.LicenseShortName?.value) || 'License not stated';
    return [{
      source: 'commons' as const,
      title: (page.title ?? 'Wikimedia Commons photograph').replace(/^File:/, ''),
      imageUrl: info.thumburl ?? info.url!,
      sourceUrl: info.descriptionurl,
      author,
      license,
      licenseUrl: meta.LicenseUrl?.value ?? '',
      latitude: coordinates.lat,
      longitude: coordinates.lon,
    }];
  });
}

async function getRegionalNasaPhotos(site: EarthSite, compact: boolean, signal: AbortSignal): Promise<NasaPhoto[]> {
  const query = `${site.name} ${site.region} ${site.country}`;
  const params = new URLSearchParams({ q: query, media_type: 'image', page_size: compact ? '5' : '10' });
  const response = await fetch(`https://images-api.nasa.gov/search?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('The NASA Images and Video Library did not respond.');
  const result = await response.json() as { collection?: { items?: NasaItem[] } };
  const terms = locationTerms(site);
  return (result.collection?.items ?? []).flatMap((item) => {
    const data = item.data?.[0];
    const preview = item.links?.find((link) => link.rel === 'preview')?.href;
    if (!data?.nasa_id || !preview) return [];
    const searchableText = `${data.title ?? ''} ${data.description ?? ''} ${(data.keywords ?? []).join(' ')}`.toLowerCase();
    if (!terms.some((term) => searchableText.includes(term))) return [];
    return [{
      source: 'nasa' as const,
      title: data.title || data.nasa_id,
      imageUrl: preview,
      sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      author: data.photographer || data.secondary_creator || data.center || 'Creator or credit not provided in the NASA record',
    }];
  });
}

export default function FieldPhotographs({ site, compact = false }: { site: EarthSite; compact?: boolean }) {
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [status, setStatus] = useState<'loading-commons' | 'loading-nasa' | 'ready' | 'error'>('loading-commons');
  const [commonsUnavailable, setCommonsUnavailable] = useState(false);
  const [compactIndex, setCompactIndex] = useState(0);
  const visiblePhotos = compact ? photos.slice(compactIndex, compactIndex + 1) : photos;

  useEffect(() => {
    const controller = new AbortController();
    setPhotos([]);
    setCompactIndex(0);
    setStatus('loading-commons');
    setCommonsUnavailable(false);
    const loadPhotos = async () => {
      try {
        const nearby = await getCommonsPhotos(site, compact, controller.signal);
        if (nearby.length > 0) {
          setPhotos(nearby);
          setStatus('ready');
          return;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCommonsUnavailable(true);
      }

      if (controller.signal.aborted) return;
      setStatus('loading-nasa');
      try {
        const regional = await getRegionalNasaPhotos(site, compact, controller.signal);
        setPhotos(regional);
        setStatus('ready');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      }
    };
    void loadPhotos();

    return () => controller.abort();
  }, [site, compact]);

  const showingNasa = photos[0]?.source === 'nasa';
  const sourceLabel = showingNasa
    ? 'NASA Images · regional search'
    : status === 'loading-nasa'
      ? 'NASA Images · regional search'
      : status === 'ready' && photos.length === 0
        ? 'Commons + NASA regional search'
        : 'Wikimedia Commons · geotagged search';

  return (
    <section className={`tt-field-photos${compact ? ' is-compact' : ''}`} aria-label={`Field imagery search for ${site.name}`} data-testid="section-field-photographs">
      <div className="tt-photos-heading">
        <div><div className="tt-kicker"><Camera size={13} /> {showingNasa ? 'Regional NASA imagery' : 'Nearby field photographs'}</div><h3>{compact ? 'Earth, observed' : `Visual context near ${site.name}`}</h3></div>
        <span className="tt-photos-source">{sourceLabel}</span>
      </div>
      {showingNasa
        ? <p className="tt-photo-caveat">These NASA images matched a regional text search for {site.name} and {site.region}; they are not necessarily geotagged or located at this field site. They provide regional visual context only.</p>
        : status === 'ready' && photos.length === 0
          ? <p className="tt-photo-caveat">Terra Lunar Atlas checks Commons for geotagged files near this site, then searches NASA records by region. Regional NASA results are context unless the asset itself identifies this site.</p>
          : <p className="tt-photo-caveat">Wikimedia Commons images are geotagged near the selected coordinates and provide local visual context. Nearby geotags do not by themselves identify the exact field site.</p>}
      {(status === 'loading-commons' || status === 'loading-nasa') && <div className="tt-photo-state" role="status"><span className="tt-photo-skeleton" />{status === 'loading-commons' ? 'Searching nearby geotagged Commons files…' : commonsUnavailable ? `Commons search is unavailable. Searching NASA records for ${site.name} and ${site.region}…` : `No nearby Commons files were found. Searching NASA records for ${site.name} and ${site.region}…`}</div>}
      {status === 'error' && <div className="tt-photo-state" role="status"><ImageOff size={16} /> Nearby photographs could not be loaded. The field-site comparison remains available.</div>}
      {status === 'ready' && photos.length === 0 && <div className="tt-photo-state" role="status"><ImageOff size={16} /> {commonsUnavailable ? 'Commons was unavailable and no region-matching NASA images were found.' : 'No nearby Commons files or region-matching NASA images were found for this site.'}</div>}
      {visiblePhotos.length > 0 && <div className="tt-photo-grid">
        {visiblePhotos.map((photo) => <article className="tt-photo-card" key={photo.sourceUrl}>
          <a className="tt-photo-image-link" href={photo.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source file for ${photo.title}`}>
            <img src={photo.imageUrl} alt={photo.source === 'commons' ? `Geotagged field photograph near ${site.name}: ${photo.title}` : `Regional NASA image associated with ${site.name}: ${photo.title}`} loading="lazy" />
            <span><ExternalLink size={12} /> {photo.source === 'commons' ? 'Commons file' : 'NASA asset'}</span>
          </a>
          <div className="tt-photo-caption">
            <strong title={photo.title}>{photo.title}</strong>
            <span>{photo.source === 'commons' ? `By ${photo.author}` : `Creator / credit: ${photo.author}`}</span>
            {photo.source === 'commons'
              ? <span>License: {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> : photo.license}</span>
              : <span>Usage: review credit and reuse terms on the NASA asset record.</span>}
            {photo.source === 'commons' && <small>{photo.latitude.toFixed(3)}°, {photo.longitude.toFixed(3)}° · geotagged file location</small>}
            <small><a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.source === 'commons' ? 'Original Commons file details' : 'NASA image asset details'}</a></small>
          </div>
        </article>)}
      </div>}
      {compact && photos.length > 1 && <div className="tt-compact-photo-controls" aria-label="Browse nearby site photographs">
        <button type="button" aria-label="Previous site photograph" onClick={() => setCompactIndex((index) => (index - 1 + photos.length) % photos.length)} data-testid="button-previous-site-photo"><ArrowLeft size={14} /> Previous</button>
        <span>{compactIndex + 1} / {photos.length}</span>
        <button type="button" aria-label="Next site photograph" onClick={() => setCompactIndex((index) => (index + 1) % photos.length)} data-testid="button-next-site-photo">Next <ArrowRight size={14} /></button>
      </div>}
    </section>
  );
}
