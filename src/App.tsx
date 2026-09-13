import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Box, Waves, Activity, Scale, ClipboardCheck, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import Explorer from './Explorer';
import Brief from './sections/Brief';
import Hydraulics from './sections/Hydraulics';
import Surge from './sections/Surge';
import Compare from './sections/Compare';
import Decision from './sections/Decision';
import AssumptionsDrawer from './AssumptionsDrawer';
import { analyse } from './engine/model.ts';
import { defaults, register, type Inputs } from './engine/assumptions.ts';
import { readSection, writeSection } from './urlState';

type Section = 'brief' | 'model' | 'hydraulics' | 'surge' | 'compare' | 'decision';
const sections: { id: Section; label: string; icon: typeof Box }[] = [
 { id: 'brief', label: 'Brief', icon: BookOpen }, { id: 'model', label: '3D model', icon: Box }, { id: 'hydraulics', label: 'Hydraulics', icon: Waves },
 { id: 'surge', label: 'Water hammer', icon: Activity }, { id: 'compare', label: 'Compare', icon: Scale }, { id: 'decision', label: 'Decision', icon: ClipboardCheck },
];
const isSection = (s: string): s is Section => sections.some(x => x.id === s);

/**
 * Decision-support shell. Owns the editable inputs and the section in view; every section reads the
 * same Analysis object so a number can never differ between pages. The 3D explorer keeps its own state.
 */
export default function App() {
 const [section, setSection] = useState<Section>(() => { const s = readSection(); return isSection(s) ? s : 'brief'; });
 const [inputs, setInputs] = useState<Inputs>(defaults);
 const [fireHydrant, setFireHydrant] = useState('');
 const [drawer, setDrawer] = useState(false);
 const set = useCallback(<K extends keyof Inputs>(k: K, v: Inputs[K]) => setInputs(i => ({ ...i, [k]: v })), []);
 const a = useMemo(() => analyse(inputs, fireHydrant || undefined), [inputs, fireHydrant]);
 useEffect(() => { writeSection(section); window.scrollTo({ top: 0 }); }, [section]);
 const go = (dir: 1 | -1) => setSection(s => sections[(sections.findIndex(x => x.id === s) + dir + sections.length) % sections.length].id);
 useEffect(() => { // ← → move between sections unless the presenter is inside a control or the 3D viewer
  const key = (e: KeyboardEvent) => {
   if (drawer || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
   const t = e.target as HTMLElement | null;
   if (t && (t.closest('input,select,textarea,[role="tablist"],canvas,[role="dialog"]'))) return;
   if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  };
  window.addEventListener('keydown', key);
  return () => window.removeEventListener('keydown', key);
 }, [drawer]);
 const changed = register.filter(r => inputs[r.key] !== defaults[r.key]).length;
 const missing = register.filter(r => r.status === 'missing').length;
 const index = sections.findIndex(x => x.id === section);
 return <main className="mx-auto max-w-[1536px]">
  <header className="flex flex-wrap items-center justify-between gap-2 bg-purple px-4 py-3 text-white md:px-8">
   <div><span className="eyebrow">Muscat Bay · Assets & Operations</span><h1 className="text-base font-semibold text-white md:text-lg">Zone 5 PO water network — option review</h1></div>
   <button className="control border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setDrawer(true)} aria-haspopup="dialog"><SlidersHorizontal size={18} />Assumptions<span className="rounded-[5px] bg-white/20 px-1.5 text-[12.25px]">{missing} missing{changed ? ` · ${changed} changed` : ''}</span></button>
  </header>
  <nav aria-label="Sections" className="sticky top-0 z-40 grid grid-cols-3 border-b border-line bg-white/90 backdrop-blur md:grid-cols-6">
   {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={section === id} className="section-tab border-transparent" onClick={() => setSection(id)}><Icon size={18} />{label}</button>)}
  </nav>
  {section === 'brief' && <Brief a={a} />}
  {section === 'model' && <Explorer />}
  {section === 'hydraulics' && <Hydraulics a={a} inputs={inputs} set={set} fireHydrant={fireHydrant} setFireHydrant={setFireHydrant} />}
  {section === 'surge' && <Surge a={a} inputs={inputs} set={set} fireHydrant={fireHydrant} setFireHydrant={setFireHydrant} />}
  {section === 'compare' && <Compare a={a} inputs={inputs} set={set} />}
  {section === 'decision' && <Decision />}
  <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 md:px-8">
   <button className="control" onClick={() => go(-1)} disabled={index === 0}><ChevronLeft size={18} />{index > 0 ? sections[index - 1].label : 'Start'}</button>
   <span className="text-[12.25px] text-muted">{index + 1} / {sections.length}</span>
   <button className="control" onClick={() => go(1)} disabled={index === sections.length - 1}>{index < sections.length - 1 ? sections[index + 1].label : 'End'}<ChevronRight size={18} /></button>
  </div>
  <footer className="flex flex-wrap justify-between gap-2 bg-purple px-4 py-3 text-[14px] text-white md:px-8"><span>Muscat Bay · Assets & Operations</span><span>Review-stage screening · Not for construction</span></footer>
  <AssumptionsDrawer open={drawer} onClose={() => setDrawer(false)} inputs={inputs} set={set} reset={() => setInputs(defaults)} />
 </main>;
}
