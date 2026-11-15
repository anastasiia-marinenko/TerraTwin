import { ArrowRight, ArrowUpRight, Moon, Orbit, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { earthSites, targets } from '@/data/analogs';
import FieldPhotographs from '@/components/FieldPhotographs';
import PlanetaryImagery from '@/components/PlanetaryImagery';

export default function MissionHome() {
  const [destination, setDestination] = useState<'moon' | 'mars'>('moon');
  const [visualMode, setVisualMode] = useState<'planet' | 'earth'>('planet');
  const moonTarget = targets.find((target) => target.body === 'moon') ?? targets[0];
  const marsTarget = targets.find((target) => target.body === 'mars') ?? targets[0];
  const target = destination === 'moon' ? moonTarget : marsTarget;
  const featuredSite = earthSites.find((site) => site.id === 'atacama') ?? earthSites[0];

  return (
    <main className="story-page mission-home">
      <section className="mission-hero">
        <div className="mission-copy">
          <p className="story-eyebrow"><Orbit size={13} /> Field question 01</p>
          <h1>Earth is our<br /><em>field station.</em></h1>
          <p className="home-deck">Use terrestrial landscapes to rehearse work for the Moon and Mars. An analogue can prepare a procedure without reproducing another world.</p>
          <div className="home-actions">
            <Link href={`/briefing?target=${encodeURIComponent(target.id)}`} className="story-button story-button-primary" data-testid="link-begin-briefing">Set the mission question <ArrowRight size={16} /></Link>
            <Link href={`/explorer?target=${encodeURIComponent(target.id)}`} className="story-text-link" data-testid="link-direct-explorer">Open the Earth map <ArrowUpRight size={14} /></Link>
          </div>
        </div>
        <div className="mission-visual mission-photo-visual" data-tour="mission-map">
          <div className="mission-visual-head"><span>{visualMode === 'planet' ? `${target.body.toUpperCase()} TARGET / ${target.name.toUpperCase()}` : `EARTH FIELD SITE / ${featuredSite.name.toUpperCase()}`}</span><span>Source-linked imagery</span></div>
          <div className="mission-visual-tabs" role="group" aria-label="Choose image context">
            <button type="button" aria-pressed={visualMode === 'planet'} onClick={() => setVisualMode('planet')}>Planetary imagery</button>
            <button type="button" aria-pressed={visualMode === 'earth'} onClick={() => setVisualMode('earth')}>Earth site photos</button>
          </div>
          {visualMode === 'planet' ? <PlanetaryImagery target={target} /> : <FieldPhotographs site={featuredSite} compact />}
          <div className="mission-visual-foot">
            <div><span>Selected planetary question</span><strong>{target.name}</strong><small>{target.region}</small></div>
            <div className="destination-switch" role="group" aria-label="Choose a planetary destination">
              <button type="button" aria-pressed={destination === 'moon'} onClick={() => setDestination('moon')} data-testid="button-home-destination-moon"><Moon size={14} /> Moon</button>
              <button type="button" aria-pressed={destination === 'mars'} onClick={() => setDestination('mars')} data-testid="button-home-destination-mars"><Sun size={14} /> Mars</button>
            </div>
          </div>
          <p className="mission-visual-note">A terrestrial landscape can support operational rehearsal, but it does not reproduce lunar gravity or vacuum, nor the Martian atmosphere and surface history.</p>
        </div>
      </section>

      <section className="mission-principle">
        <div className="mission-principle-title">
          <p className="story-eyebrow">The useful analogy</p>
          <h2>Rehearse the work.<br /><em>Keep the differences visible.</em></h2>
        </div>
        <div className="principle-grid">
          <article><span>Can help rehearse</span><p>Mobility, instrument handling, geological observation, navigation, and field procedures.</p></article>
          <article><span>Cannot reproduce</span><p>Reduced gravity, lunar vacuum, the thin Martian atmosphere, radiation, or exact planetary materials.</p></article>
        </div>
      </section>

      <section className="home-route">
        <div className="home-route-intro">
          <p className="story-eyebrow">Expedition sequence</p>
          <h2>Choose a target.<br /><em>Follow the evidence.</em></h2>
          <p>Start with a terrain question, inspect candidate places on Earth, then review how the comparison was made.</p>
        </div>
        <div className="route-steps">
          <Link href="/briefing" data-testid="link-route-briefing"><span>01</span><strong>Set the question</strong><small>Choose a lunar or Martian target.</small><ArrowRight size={17} /></Link>
          <Link href="/explorer" data-testid="link-route-explorer"><span>02</span><strong>Explore Earth</strong><small>Inspect sites and adjust the local comparison.</small><ArrowRight size={17} /></Link>
          <Link href="/field-notes" data-testid="link-route-field-notes"><span>03</span><strong>Keep a field note</strong><small>Save places worth returning to.</small><ArrowRight size={17} /></Link>
          <Link href="/method" data-testid="link-route-method"><span>04</span><strong>Review the limits</strong><small>See what this prototype can and cannot say.</small><ArrowRight size={17} /></Link>
        </div>
      </section>
    </main>
  );
}
