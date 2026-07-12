import { writeFileSync, mkdirSync } from 'node:fs';
import { encodeCandles } from '../src/data/codec.ts';
import type { Candle } from '../src/data/types.ts';
import { fileSymbol, TIMEFRAMES, type Manifest, type StockMeta, type Timeframe } from '../src/data/manifest.ts';

const UNIVERSE: Array<{ yahoo: string; symbol: string; name: string; index?: boolean }> = [
  { yahoo: '^NSEI', symbol: 'NIFTY50', name: 'NIFTY 50', index: true },
  { yahoo: '^NSEBANK', symbol: 'BANKNIFTY', name: 'BANK NIFTY', index: true },
  { yahoo: '^BSESN', symbol: 'SENSEX', name: 'SENSEX', index: true },
  { yahoo: 'RELIANCE.NS', symbol: 'RELIANCE', name: 'Reliance Industries' },
  { yahoo: 'TCS.NS', symbol: 'TCS', name: 'Tata Consultancy Services' },
  { yahoo: 'HDFCBANK.NS', symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { yahoo: 'ICICIBANK.NS', symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { yahoo: 'INFY.NS', symbol: 'INFY', name: 'Infosys' },
  { yahoo: 'HINDUNILVR.NS', symbol: 'HINDUNILVR', name: 'Hindustan Unilever' },
  { yahoo: 'ITC.NS', symbol: 'ITC', name: 'ITC' },
  { yahoo: 'SBIN.NS', symbol: 'SBIN', name: 'State Bank of India' },
  { yahoo: 'BHARTIARTL.NS', symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
  { yahoo: 'KOTAKBANK.NS', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank' },
  { yahoo: 'LT.NS', symbol: 'LT', name: 'Larsen & Toubro' },
  { yahoo: 'AXISBANK.NS', symbol: 'AXISBANK', name: 'Axis Bank' },
  { yahoo: 'ASIANPAINT.NS', symbol: 'ASIANPAINT', name: 'Asian Paints' },
  { yahoo: 'MARUTI.NS', symbol: 'MARUTI', name: 'Maruti Suzuki' },
  { yahoo: 'SUNPHARMA.NS', symbol: 'SUNPHARMA', name: 'Sun Pharma' },
  { yahoo: 'TITAN.NS', symbol: 'TITAN', name: 'Titan Company' },
  { yahoo: 'ULTRACEMCO.NS', symbol: 'ULTRACEMCO', name: 'UltraTech Cement' },
  { yahoo: 'WIPRO.NS', symbol: 'WIPRO', name: 'Wipro' },
  { yahoo: 'NESTLEIND.NS', symbol: 'NESTLEIND', name: 'Nestle India' },
  { yahoo: 'BAJFINANCE.NS', symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
  { yahoo: 'M&M.NS', symbol: 'M&M', name: 'Mahindra & Mahindra' },
  { yahoo: 'NTPC.NS', symbol: 'NTPC', name: 'NTPC' },
  { yahoo: 'HCLTECH.NS', symbol: 'HCLTECH', name: 'HCL Technologies' },
  { yahoo: 'POWERGRID.NS', symbol: 'POWERGRID', name: 'Power Grid' },
  { yahoo: 'TATAMOTORS.NS', symbol: 'TATAMOTORS', name: 'Tata Motors' },
  { yahoo: 'TATASTEEL.NS', symbol: 'TATASTEEL', name: 'Tata Steel' },
  { yahoo: 'ADANIENT.NS', symbol: 'ADANIENT', name: 'Adani Enterprises' },
  { yahoo: 'ADANIPORTS.NS', symbol: 'ADANIPORTS', name: 'Adani Ports' },
  { yahoo: 'COALINDIA.NS', symbol: 'COALINDIA', name: 'Coal India' },
  { yahoo: 'BAJAJFINSV.NS', symbol: 'BAJAJFINSV', name: 'Bajaj Finserv' },
  { yahoo: 'DRREDDY.NS', symbol: 'DRREDDY', name: "Dr. Reddy's Labs" },
  { yahoo: 'GRASIM.NS', symbol: 'GRASIM', name: 'Grasim Industries' },
  { yahoo: 'HINDALCO.NS', symbol: 'HINDALCO', name: 'Hindalco' },
  { yahoo: 'TECHM.NS', symbol: 'TECHM', name: 'Tech Mahindra' },
  { yahoo: 'INDUSINDBK.NS', symbol: 'INDUSINDBK', name: 'IndusInd Bank' },
  { yahoo: 'JSWSTEEL.NS', symbol: 'JSWSTEEL', name: 'JSW Steel' },
  { yahoo: 'CIPLA.NS', symbol: 'CIPLA', name: 'Cipla' },
  { yahoo: 'EICHERMOT.NS', symbol: 'EICHERMOT', name: 'Eicher Motors' },
  { yahoo: 'ONGC.NS', symbol: 'ONGC', name: 'ONGC' },
  { yahoo: 'HEROMOTOCO.NS', symbol: 'HEROMOTOCO', name: 'Hero MotoCorp' },
  { yahoo: 'DIVISLAB.NS', symbol: 'DIVISLAB', name: "Divi's Labs" },
  { yahoo: 'APOLLOHOSP.NS', symbol: 'APOLLOHOSP', name: 'Apollo Hospitals' },
  { yahoo: 'BRITANNIA.NS', symbol: 'BRITANNIA', name: 'Britannia' },
  { yahoo: 'TATACONSUM.NS', symbol: 'TATACONSUM', name: 'Tata Consumer' },
  { yahoo: 'BPCL.NS', symbol: 'BPCL', name: 'BPCL' },
  { yahoo: 'SBILIFE.NS', symbol: 'SBILIFE', name: 'SBI Life' },
  { yahoo: 'HDFCLIFE.NS', symbol: 'HDFCLIFE', name: 'HDFC Life' },
  { yahoo: 'BAJAJ-AUTO.NS', symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto' },
  { yahoo: 'SHRIRAMFIN.NS', symbol: 'SHRIRAMFIN', name: 'Shriram Finance' },
  { yahoo: 'LTIM.NS', symbol: 'LTIM', name: 'LTIMindtree' },
];

const TF_PARAMS: Record<Timeframe, { range: string; interval: string }> = {
  '15m': { range: '60d', interval: '15m' },
  '1h': { range: '730d', interval: '1h' },
  '1d': { range: '5y', interval: '1d' },
  '1wk': { range: '10y', interval: '1wk' },
};

const MIN_CANDLES = 60;
const OUT = 'public/data';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCandles(yahoo: string, tf: Timeframe): Promise<Candle[]> {
  const { range, interval } = TF_PARAMS[tf];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (stochastick data pipeline)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!q) throw new Error('no quote data');
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if (o == null || h == null || l == null || c == null) continue;
    out.push({ t: ts[i]!, o, h, l, c });
  }
  return out;
}

function sparkline(candles: Candle[]): number[] {
  const closes = candles.slice(-30).map((c) => c.c);
  const min = Math.min(...closes), max = Math.max(...closes);
  const span = max - min || 1;
  return closes.map((c) => Math.round(((c - min) / span) * 99));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const stocks: StockMeta[] = [];
  for (const stock of UNIVERSE) {
    const meta: StockMeta = { symbol: stock.symbol, name: stock.name, spark: [], tfs: {} };
    if (stock.index) meta.index = true;
    for (const tf of TIMEFRAMES) {
      try {
        const candles = await fetchCandles(stock.yahoo, tf);
        if (candles.length < MIN_CANDLES) {
          console.warn(`skip ${stock.symbol} ${tf}: only ${candles.length} candles`);
          continue;
        }
        writeFileSync(`${OUT}/${fileSymbol(stock.symbol)}_${tf}.bin`, Buffer.from(encodeCandles(candles)));
        meta.tfs[tf] = { n: candles.length, from: candles[0]!.t, to: candles[candles.length - 1]!.t };
        if (tf === '1d') meta.spark = sparkline(candles);
        console.log(`ok ${stock.symbol} ${tf}: ${candles.length} candles`);
      } catch (e) {
        console.warn(`skip ${stock.symbol} ${tf}: ${(e as Error).message}`);
      }
      await sleep(250);
    }
    if (Object.keys(meta.tfs).length > 0) stocks.push(meta);
  }
  const manifest: Manifest = { generated: new Date().toISOString(), stocks };
  writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));
  console.log(`\nmanifest: ${stocks.length} stocks`);
}

main();
