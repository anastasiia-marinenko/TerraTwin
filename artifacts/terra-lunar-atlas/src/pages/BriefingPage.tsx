import { ArrowRight, Crosshair, Moon, Orbit } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { targets, type TargetSite } from '@/data/analogs';

function TargetCard({ target, selected, onSelect }: { target: TargetSite; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} data-testid={`button-select-target-${target.id}`} className={`target-card${selected ? ' is-selected' : ''}`}>
      <span className="target-card-top"><span>{target.body === 'moon' ? 'MOON' : 'MARS'} / TARGET</span><Crosshair size={14} /></span>
      <strong>{target.name}</strong>
      <small>{target.region}</small>
      <p>{target.summary}</p>
      <span className="target-card-coordinates">{Math.abs(target.latitude).toFixed(2)}° {target.latitude < 0 ? 'S' : 'N'} · {Math.abs(target.longitude).toFixed(2)}° {target.longitude < 0 ? 'W' : 'E'}</span>
    </button>
  );
}

export default function BriefingPage() {
  const params = new URLSearchParams(window.location.search);
  const initial = targets.find((target) => target.id === params.get('target'))?.id ?? targets[0].id;
  const [targetId, setTargetId] = useState(initial);
  const selected = targets.find((target) => target.id === targetId) ?? targets[0];
  return (
    <main className="story-page">
      <section className="page-heading">
        <div className="page-heading-index">CHAPTER 02 / MISSION BRIEF</div>
        <p className="story-eyebrow">Choose the question before the place</p>
        <h1>What kind of ground<br /><em>are we rehearsing for?</em></h1>
        <p className="page-lede">Select a lunar or Martian setting to frame the question. The target references identify planetary context; they are not inputs to a quantitative comparison with Earth.</p>
      </section>
      <div className="briefing-layout">
        <section className="target-grid" aria-label="Planetary target selection" data-tour="target-selection">
          {targets.map((target) => <TargetCard key={target.id} target={target} selected={target.id === targetId} onSelect={() => setTargetId(target.id)} />)}
        </section>
        <aside className="briefing-question">
          <div className="briefing-orbit"><Orbit size={24} /><span>MISSION QUESTION</span></div>
          <span className="briefing-body">{selected.body === 'moon' ? 'LUNAR FIELD REHEARSAL' : 'MARTIAN FIELD REHEARSAL'}</span>
          <h2>Which Earth site can help us practice the work this terrain demands?</h2>
          <p>{selected.summary}</p>
          <div className="briefing-caveat"><Moon size={14} /><span>Earth analogies support operational practice; they do not reproduce the target's gravity, atmosphere, materials, or history.</span></div>
          <Link href={`/explorer?target=${encodeURIComponent(selected.id)}`} className="story-button story-button-primary" data-testid="link-open-selected-target">Open this investigation <ArrowRight size={16} /></Link>
        </aside>
      </div>
    </main>
  );
}
