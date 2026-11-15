import { useEffect, useState } from 'react';
import { ExternalLink, ImageOff, Orbit } from 'lucide-react';
import type { TargetSite } from '@/data/analogs';

type NasaItem = {
  data?: Array<{ title?: string; nasa_id?: string; description?: string; photographer?: string; center?: string }>;
  links?: Array<{ href?: string; rel?: string }>;
};
type ImageRecord = { title: string; image: string; url: string; credit: string; targetSearch: boolean };

const conceptOrHardware = /\b(?:artist(?:'s)? concept|artist'?s? impression|illustration|computer[- ]generated|rendering|mission art|spacecraft is being prepared|technicians prepare)\b/i;

function recordsFrom(items: NasaItem[], targetSearch: boolean): ImageRecord[] {
  return items.flatMap((item) => {
    const data = item.data?.[0];
    const image = item.links?.find((link) => link.rel === 'preview')?.href;
    if (!data?.nasa_id || !image || conceptOrHardware.test(`${data.title ?? ''} ${data.description ?? ''}`)) return [];
    return [{
      title: data.title || data.nasa_id,
      image,
      url: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      credit: data.photographer || data.center || 'NASA Image and Video Library record',
      targetSearch,
    }];
  });
}

async function searchNasaImages(query: string, signal: AbortSignal): Promise<NasaItem[]> {
  const response = await fetch(`https://images-api.nasa.gov/search?${new URLSearchParams({ q: query, media_type: 'image', page_size: '30' })}`, { signal });
  if (!response.ok) throw new Error('NASA Images search is unavailable.');
  const result = await response.json() as { collection?: { items?: NasaItem[] } };
  return result.collection?.items ?? [];
}

export default function PlanetaryImagery({ target }: { target: TargetSite }) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setImages([]);
    setIndex(0);
    const loadImages = async () => {
      try {
        const query = `${target.name} ${target.body === 'moon' ? 'Moon lunar' : 'Mars'} NASA`;
        let records = recordsFrom(await searchNasaImages(query, controller.signal), true);
        if (!records.length) {
          const contextQuery = target.body === 'moon' ? 'Moon LRO surface' : 'Mars rover surface NASA';
          records = recordsFrom(await searchNasaImages(contextQuery, controller.signal), false);
        }
        if (controller.signal.aborted) return;
        setImages(records);
        setStatus('ready');
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      }
    };
    void loadImages();
    return () => controller.abort();
  }, [target.id, target.name, target.body]);

  const current = images[index];
  return (
    <section className="planetary-image-panel" aria-label={`NASA imagery for ${target.name}`}>
      <div className="planetary-image-label"><span><Orbit size={13} /> NASA PLANETARY IMAGE SEARCH</span><span>{target.body === 'moon' ? 'LUNAR CONTEXT' : 'MARTIAN CONTEXT'}</span></div>
      {status === 'loading' && <div className="planetary-image-state" role="status"><span className="planetary-image-skeleton" />Searching NASA’s image library for {target.name}…</div>}
      {status === 'error' && <div className="planetary-image-state" role="status"><ImageOff size={17} /> NASA image search is temporarily unavailable. Target sources remain available in the briefing.</div>}
      {status === 'ready' && !current && <div className="planetary-image-state" role="status"><ImageOff size={17} /> No image records were returned for this search.</div>}
      {current && <>
        <a className="planetary-image-link" href={current.url} target="_blank" rel="noreferrer">
          <img key={current.image} src={current.image} alt={`${target.body === 'moon' ? 'Lunar' : 'Martian'} image result: ${current.title}`} />
          <span><ExternalLink size={12} /> Open NASA record</span>
        </a>
        <div className="planetary-image-caption"><strong>{current.title}</strong><small>{current.credit} · NASA Image and Video Library</small></div>
        <div className="planetary-image-controls">
          <span>{index + 1} / {images.length} results</span>
          <div>
            <button type="button" onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)} aria-label="Previous NASA image" data-testid="button-previous-planet-image">Previous</button>
            <button type="button" onClick={() => setIndex((value) => (value + 1) % images.length)} aria-label="Next NASA image" data-testid="button-next-planet-image">Next image</button>
          </div>
        </div>
      </>}
        <p className="planetary-image-note">{current?.targetSearch
          ? `NASA catalog results for ${target.name}. Open each record to verify its location and imaging method; images provide context, not terrain measurements.`
          : `NASA has no indexed image returned for ${target.name}; showing broader ${target.body === 'moon' ? 'lunar' : 'Martian'} context instead. This image is not identified as the selected site.`}</p>
    </section>
  );
}
