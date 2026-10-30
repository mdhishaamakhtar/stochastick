export type Timeframe = '15m' | '1h' | '1d' | '1wk';

export const TIMEFRAMES: Timeframe[] = ['15m', '1h', '1d', '1wk'];

export const TF_LABELS: Record<Timeframe, string> = {
  '15m': '15 Min',
  '1h': '1 Hour',
  '1d': 'Daily',
  '1wk': 'Weekly',
};

export const TIERS = ['Easy', 'Medium', 'Hard', 'Brutal'] as const;
export type Tier = (typeof TIERS)[number];

export const tierOf = (difficulty: number): Tier => TIERS[Math.min(3, Math.floor(difficulty / 25))]!;

export interface TfMeta {
  n: number;
  from: number;
  to: number;
  /** 0 (easiest) to 99 (hardest), ranked across every chart by a bot's flights */
  d?: number;
}

export interface StockMeta {
  symbol: string;
  name: string;
  index?: boolean;
  spark: number[]; // 30 values, 0-99, recent daily closes normalized
  last?: number; // latest daily close, rupees
  chg?: number; // % change over the last ~22 trading days
  tfs: Partial<Record<Timeframe, TfMeta>>;
}

export interface Manifest {
  generated: string;
  stocks: StockMeta[];
}

export function tierFor(stock: StockMeta | null, tf: Timeframe): Tier | null {
  const d = stock?.tfs[tf]?.d;
  return d === undefined ? null : tierOf(d);
}

export function fileSymbol(symbol: string): string {
  return symbol.replace(/[^A-Za-z0-9]/g, '');
}
