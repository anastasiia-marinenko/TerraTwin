import { ArrowRight, Bookmark, Compass, MapPin, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { earthSites } from '@/data/analogs';

const STORAGE_KEY = 'terratwin-field-shortlist';

function readSaved() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && earthSites.some((site) => site.id === id)) : [];
  } catch {
    return [];
  }
}

export default function FieldNotesPage() {
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  useEffect(() => {
    const refresh = () => setSavedIds(readSaved());
    window.addEventListener('storage', refresh);
    window.addEventListener('terratwin-shortlist-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('terratwin-shortlist-change', refresh);
    };
  }, []);
  const remove = (id: string) => {
    const next = savedIds.filter((savedId) => savedId !== id);
    setSavedIds(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Local notes remain usable if storage is unavailable. */ }
    window.dispatchEvent(new Event('terratwin-shortlist-change'));
  };
  const savedSites = savedIds.map((id) => earthSites.find((site) => site.id === id)).filter((site) => site !== undefined);
  return (
    <main className="story-page">
      <section className="page-heading notes-heading">
        <div className="page-heading-index">CHAPTER 04 / FIELD LOG</div>
        <p className="story-eyebrow">A working shortlist, not a verdict</p>
        <h1>Places to return to.<br /><em>Questions to carry.</em></h1>
        <p className="page-lede">Saved sites stay on this device. Reopen a place in the explorer to inspect its local Earth profile, source context, and limits as a planetary analogue.</p>
      </section>
      {savedSites.length ? (
        <section className="notes-list" aria-label="Saved field candidates" data-tour="field-notes">
          <div className="notes-list-head"><span>SHORTLIST / {String(savedSites.length).padStart(2, '0')} SAVED</span><Link href="/explorer" data-testid="link-notes-back-explorer">Continue exploring <ArrowRight size={14} /></Link></div>
          {savedSites.map((site, index) => (
            <article className="note-entry" key={site.id} data-testid={`card-saved-site-${site.id}`}>
              <span className="note-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="note-site">
                <div className="story-eyebrow"><MapPin size={12} /> {site.region} · {site.country}</div>
                <h2>{site.name}</h2>
                <p>{site.terrain}</p>
              </div>
              <div className="note-rehearsal"><span>FIELD REHEARSAL</span><p>{site.missionUse}</p></div>
              <div className="note-limit"><span>ANALOGY LIMIT</span><p>{site.breaksDown}</p></div>
              <div className="note-actions">
                <Link href={`/explorer?site=${encodeURIComponent(site.id)}`} data-testid={`link-reopen-site-${site.id}`}>Reopen <ArrowRight size={14} /></Link>
                <button type="button" data-testid={`button-remove-note-${site.id}`} onClick={() => remove(site.id)} aria-label={`Remove ${site.name} from field notes`}><Trash2 size={14} /> Remove</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="notes-empty" data-testid="empty-field-notes" data-tour="field-notes">
          <span className="empty-mark"><Bookmark size={22} /></span>
          <span className="story-eyebrow">No saved candidates yet</span>
          <h2>Your field notes begin with a place worth revisiting.</h2>
          <p>In the explorer, save an Earth site to keep its terrain context, operational use, and analogy limits close at hand.</p>
          <Link href="/briefing" className="story-button story-button-primary" data-testid="link-start-field-notes">Choose a target <Compass size={15} /></Link>
        </section>
      )}
      <section className="notes-context">
        <span>FIELD REMINDER</span>
        <p>A shortlist records questions for further investigation. It does not indicate a validated analogue, mission recommendation, or measured similarity in real terrain.</p>
      </section>
    </main>
  );
}
