import type { Fighter } from '../render/fighters.ts';

const get = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const set = (k: string, v: string): void => {
  try { localStorage.setItem(k, v); } catch { /* private mode: nothing persists */ }
};

export const getBest = (symbol: string, tf: string): number => Number(get(`stochastick.best.${symbol}.${tf}`)) || 0;
export function setBest(symbol: string, tf: string, score: number): void {
  if (score > getBest(symbol, tf)) set(`stochastick.best.${symbol}.${tf}`, String(score));
}

export const getFighter = (): Fighter => (get('stochastick.fighter') === 'bear' ? 'bear' : 'bull');
export const setFighter = (f: Fighter): void => set('stochastick.fighter', f);

export const getMuted = (): boolean => get('stochastick.muted') === '1';
export const setMuted = (m: boolean): void => set('stochastick.muted', m ? '1' : '0');
