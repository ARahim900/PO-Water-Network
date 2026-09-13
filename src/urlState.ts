import { steps } from './content';
import data from './networkData.json';
import type { ModelSettings, Option, View, Weather } from './types';
/** The view a reviewer lands on: the recommended option, so the page opens on the case it argues. */
export const defaults: ModelSettings = {option:'buried',view:'section',opened:false,weather:'dry',step:0,showBase:true,showAssets:true,selectedPath:'all',animation:'off',flow:false,flowPaused:false};
const options: Option[] = ['buried','channel'];
const views: View[] = ['network','section','run','tapping','weather'];
const weathers: Weather[] = ['dry','rain','sand'];
const pick = <T extends string>(allowed: readonly T[], value: string|null, fallback: T): T => allowed.includes(value as T) ? value as T : fallback;
const flag = (value: string|null, fallback: boolean): boolean => value === '1' ? true : value === '0' ? false : fallback;
/** Reads a shared link. Anything unrecognised falls back to the default, so a mangled link still opens. */
export function readSettings(hash: string = window.location.hash): ModelSettings {
 const q = new URLSearchParams(hash.replace(/^#/,''));
 const route = q.get('route');
 const view = pick(views,q.get('view'),defaults.view);
 const demonstration = view === 'run' || view === 'tapping';
 const step = q.has('step') ? Number(q.get('step')) : view === 'tapping' ? 3 : defaults.step;
 return {
  ...defaults,
  option: pick(options,q.get('option'),defaults.option),
  view,
  weather: pick(weathers,q.get('weather'),defaults.weather),
  step: Number.isInteger(step) && step >= 0 && step < steps.length ? step : defaults.step,
  opened: flag(q.get('open'),defaults.opened),
  flow: flag(q.get('flow'),demonstration),
  showBase: flag(q.get('base'),defaults.showBase),
  showAssets: flag(q.get('assets'),defaults.showAssets),
  selectedPath: route && (route === 'all' || data.paths.some(p => p.name === route)) ? route : defaults.selectedPath,
 };
}
/** Mirrors the current view into the address bar so a reviewer can send the exact view they are describing.
 *  replaceState, not pushState: browsing the model should not fill the back button. Some hosts — a sandboxed
 *  iframe, an embedded viewer — refuse history writes; the model must still work there, so failure is ignored. */
export function writeSettings(s: ModelSettings): void {
 const q = new URLSearchParams();
 const section = readSection();
 if(section) q.set('s',section); // the decision-support section is kept so a link opens where the presenter left it
 q.set('option',s.option); q.set('view',s.view);
 if(s.view === 'tapping') q.set('step',String(s.step));
 if(s.view === 'weather') q.set('weather',s.weather);
 if(s.view === 'network'){ q.set('route',s.selectedPath); q.set('base',s.showBase?'1':'0'); q.set('assets',s.showAssets?'1':'0'); }
 else if(s.opened) q.set('open','1');
 if(s.flow || s.view === 'run' || s.view === 'tapping') q.set('flow',s.flow?'1':'0');
 try { window.history.replaceState(null,'',`#${q}`); } catch { /* history is unavailable in this host */ }
}
/** The decision-support section (`s=`) travels in the same hash as the 3D view so one link restores both. */
export function readSection(hash: string = window.location.hash): string {
 return new URLSearchParams(hash.replace(/^#/,'')).get('s') ?? '';
}
export function writeSection(section: string): void {
 const q = new URLSearchParams(window.location.hash.replace(/^#/,''));
 q.set('s',section);
 try { window.history.replaceState(null,'',`#${q}`); } catch { /* history is unavailable in this host */ }
}
