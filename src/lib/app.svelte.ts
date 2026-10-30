import type { Manifest, StockMeta, Timeframe } from '../data/manifest.ts';
import type { Fighter } from '../render/fighters.ts';
import type { Phase } from '../game/state.ts';
import { getFighter } from './storage.ts';
import { isMuted } from '../game/audio.ts';

export type Screen = 'landing' | 'picker' | 'game';

export interface DeathInfo {
  score: number;
  best: number;
  isNewBest: boolean;
  survivedAll: boolean;
  date: string;
  price: number;
  startDate: string;
  startPrice: number;
  changePct: number;
  /** whole level, normalized closes, downsampled */
  chart: number[];
  /** where on `chart` (0..1) the run ended */
  at: number;
  up: boolean;
  /** performance.now() when the card went up */
  shownAt: number;
}

/** Everything the UI renders. The engine writes here; components read. */
export const app = $state({
  screen: 'landing' as Screen,
  fighter: getFighter() as Fighter,
  muted: isMuted(),
  manifest: null as Manifest | null,
  failed: false,
  loading: null as string | null,

  stock: null as StockMeta | null,
  tf: '1d' as Timeframe,
  phase: 'ready' as Phase,
  /** a run frozen by a tab switch, waiting for a tap to resume */
  paused: false,
  score: 0,
  best: 0,
  date: '',
  price: 0,
  up: true,
  progress: 0,
  chart: [] as number[],
  death: null as DeathInfo | null,

  demo: { name: '', date: '', price: 0, up: true },
});
