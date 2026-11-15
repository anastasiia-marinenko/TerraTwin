import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Compass, FileText, HelpCircle, Moon, Orbit, ScrollText, Search, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import './expedition.css';

const chapters = [
  { href: '/', label: 'Mission', number: '01', icon: Compass },
  { href: '/briefing', label: 'Briefing', number: '02', icon: Orbit },
  { href: '/explorer', label: 'Explore', number: '03', icon: Search },
  { href: '/field-notes', label: 'Field notes', number: '04', icon: FileText },
  { href: '/method', label: 'Method', number: '05', icon: ScrollText },
];

const tourSteps = [
  { route: '/', anchor: 'mission-map', title: 'Start with a terrain question', body: 'The expedition links a planetary target to an Earth field site. The diagram is conceptual, not a terrain measurement.', action: 'Choose a target' },
  { route: '/briefing', anchor: 'target-selection', title: 'Select the planetary context', body: 'Choose a Moon or Mars location to frame the field question. Earth sites remain candidate context, not validated matches.', action: 'Open the Earth map' },
  { route: '/explorer', anchor: 'explorer-map', title: 'Read the map and candidate places', body: 'Satellite imagery provides geographic context. Pins mark Earth field-site coordinates; selecting one requests its local SRTM profile.', action: 'Inspect a site' },
  { route: '/explorer', anchor: 'explorer-map', title: 'Keep the evidence in scope', body: 'SRTM statistics describe an Earth neighborhood only. They are not compared with planetary terrain and do not produce similarity scores.', action: 'Inspect an Earth site' },
  { route: '/explorer', anchor: 'save-candidate', title: 'Keep a candidate for later', body: 'Save a site to Field notes on this device. A shortlist is a prompt for further study, not a recommendation or validated match.', action: 'Open Field notes' },
  { route: '/field-notes', anchor: 'field-notes', title: 'Return to saved places', body: 'Reopen a site to inspect its terrain context, rehearsal use, and analogy limits. Remove it when it no longer belongs on your list.', action: 'Read the method limits' },
  { route: '/method', anchor: 'method-limits', title: 'Know where the analogy ends', body: 'Earth can support operational rehearsal, but cannot reproduce lunar or Martian gravity, atmosphere, materials, or geological history.', action: 'Finish guide' },
];

export default function ExpeditionShell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const reduceMotion = useReducedMotion();
  const active = Math.max(0, chapters.findIndex((chapter) => chapter.href === location.split('?')[0]));
  const [theme, setTheme] = useState<'night' | 'day'>(() => {
    try { return localStorage.getItem('terratwin-theme') === 'day' ? 'day' : 'night'; } catch { return 'night'; }
  });
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tourCard = useRef<HTMLElement | null>(null);
  const tourLaunch = useRef<HTMLButtonElement>(null);
  const step = tourIndex === null ? null : tourSteps[tourIndex];

  useEffect(() => {
    document.documentElement.dataset.terraTheme = theme;
    try { localStorage.setItem('terratwin-theme', theme); } catch { /* Theme still applies for this session. */ }
  }, [theme]);

  useEffect(() => {
    if (!step || location.split('?')[0] !== step.route) return;
    let frame = 0;
    const findAnchor = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (!element) return;
      element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      frame = window.requestAnimationFrame(() => {
        setTargetRect(element.getBoundingClientRect());
        if (tourCard.current) tourCard.current.focus();
      });
    };
    const timeout = window.setTimeout(findAnchor, 90);
    const updateRect = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (element) setTargetRect(element.getBoundingClientRect());
    };
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step, location, reduceMotion]);

  const closeTour = useCallback(() => {
    setTourIndex(null);
    setTargetRect(null);
    window.requestAnimationFrame(() => tourLaunch.current?.focus());
  }, []);

  const advance = useCallback((direction: number) => {
    if (tourIndex === null) return;
    const next = tourIndex + direction;
    if (next < 0) return;
    if (next >= tourSteps.length) { closeTour(); return; }
    setTargetRect(null);
    setTourIndex(next);
    navigate(tourSteps[next].route);
  }, [closeTour, navigate, tourIndex]);

  useEffect(() => {
    if (tourIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTour();
      if (event.key === 'ArrowRight') { event.preventDefault(); advance(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); advance(-1); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [advance, closeTour, tourIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [location, reduceMotion]);

  return (
    <div className="expedition" data-theme={theme}>
      <div className="expedition-atmosphere" aria-hidden="true" />
      <header className="expedition-header">
        <Link href="/" className="expedition-brand" data-testid="link-brand-home" aria-label="Terra Lunar Atlas mission home">
          <span className="expedition-brand-mark"><Orbit size={19} /></span>
          <span className="expedition-brand-copy"><strong>Terra Lunar Atlas</strong><small>Field mission instrument</small></span>
        </Link>
        <div className="expedition-header-status"><span className="status-pip" /> Earth data · planetary context</div>
        <div className="expedition-tools">
          <div className="theme-switch" role="group" aria-label="Visual theme">
            <button type="button" onClick={() => setTheme('night')} aria-pressed={theme === 'night'} aria-label="Use deep-space night theme" data-testid="button-theme-night"><Moon size={15} /><span>Night</span></button>
            <button type="button" onClick={() => setTheme('day')} aria-pressed={theme === 'day'} aria-label="Use daylight field-survey theme" data-testid="button-theme-day"><Sun size={15} /><span>Day</span></button>
          </div>
          <button ref={tourLaunch} type="button" className="tour-launch" onClick={() => { setTargetRect(null); setTourIndex(0); navigate('/'); }} data-testid="button-start-tour"><HelpCircle size={16} /><span>Guided tour</span></button>
        </div>
        <nav className="expedition-nav" aria-label="Expedition chapters">
          {chapters.map(({ href, label, number, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-chapter-${label.toLowerCase().replaceAll(' ', '-')}`}
              className={`expedition-nav-link${active === index ? ' is-active' : ''}${index < active ? ' is-passed' : ''}`}
              aria-current={active === index ? 'page' : undefined}
            >
              <span className="nav-number">{number}</span><Icon size={14} /><span>{label}</span>
            </Link>
          ))}
        </nav>
      </header>
      <div className="expedition-progress" aria-label={`Chapter ${active + 1} of ${chapters.length}`}>
        <span style={{ transform: `scaleX(${(active + 1) / chapters.length})` }} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.split('?')[0]}
          className="expedition-route"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.2, 0.75, 0.25, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <footer className="expedition-footer">
        <span>Terra Lunar Atlas / Planetary field rehearsal</span>
        <span>Local SRTM profile · no planetary similarity scoring</span>
      </footer>
      {tourIndex !== null && step && <div className="tour-layer" aria-label="Guided walkthrough">
        {targetRect && <div className="tour-spotlight" style={{ top: targetRect.top - 7, left: targetRect.left - 7, width: targetRect.width + 14, height: targetRect.height + 14 }} aria-hidden="true" />}
        <section className="tour-card" ref={tourCard} role="dialog" aria-modal="false" aria-labelledby="tour-title" tabIndex={-1} data-testid="tour-card">
          <div className="tour-card-top"><span>FIELD GUIDE · {String(tourIndex + 1).padStart(2, '0')} / {String(tourSteps.length).padStart(2, '0')}</span><button type="button" aria-label="Close guided tour" onClick={closeTour}><X size={17} /></button></div>
          <div className="tour-progress" aria-label={`Step ${tourIndex + 1} of ${tourSteps.length}`}><span style={{ width: `${((tourIndex + 1) / tourSteps.length) * 100}%` }} /></div>
          <h2 id="tour-title">{step.title}</h2><p>{step.body}</p>
          <div className="tour-card-bottom"><button type="button" className="tour-skip" onClick={closeTour}>Skip tour</button><div>
            {tourIndex > 0 && <button type="button" className="tour-back" data-testid="button-tour-back" onClick={() => advance(-1)}><ArrowLeft size={15} /> Back</button>}
            <button type="button" className="tour-next" data-testid="button-tour-next" onClick={() => advance(1)}>{tourIndex === tourSteps.length - 1 ? <>Finish <Check size={15} /></> : <>{step.action} <ArrowRight size={15} /></>}</button>
          </div></div>
          <span className="tour-key-hint">Use ← → to move · Esc to close</span>
        </section>
      </div>}
    </div>
  );
}
