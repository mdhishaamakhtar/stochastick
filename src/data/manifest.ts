export type Timeframe = '15m' | '1h' | '1d' | '1wk';

export const TIMEFRAMES: Timeframe[] = ['15m', '1h', '1d', '1wk'];

export const TF_LABELS: Record<Timeframe, string> = {
  '15m': '15 Min',
  '1h': '1 Hour',
  '1d': 'Daily',
  '1wk': 'Weekly',
};

export interface TfMeta { n: number; from: number; to: number }

export interface StockMeta {
  symbol: string;
  name: string;
  index?: boolean;
  spark: number[]; // 30 values, 0-99, recent daily closes normalized
  tfs: Partial<Record<Timeframe, TfMeta>>;
}

export interface Manifest {
  generated: string;
  stocks: StockMeta[];
}

export function fileSymbol(symbol: string): string {
  return symbol.replace(/[^A-Za-z0-9]/g, '');
}
