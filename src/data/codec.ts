import type { Candle } from './types.ts';

const MAGIC = 0x314b5453; // "STK1" little-endian

export function encodeCandles(candles: Candle[]): ArrayBuffer {
  const n = candles.length;
  const buf = new ArrayBuffer(8 + n * 4 + n * 16);
  const dv = new DataView(buf);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, n, true);
  let off = 8;
  for (const cd of candles) { dv.setUint32(off, cd.t, true); off += 4; }
  for (const cd of candles) {
    dv.setInt32(off, Math.round(cd.o * 100), true);
    dv.setInt32(off + 4, Math.round(cd.h * 100), true);
    dv.setInt32(off + 8, Math.round(cd.l * 100), true);
    dv.setInt32(off + 12, Math.round(cd.c * 100), true);
    off += 16;
  }
  return buf;
}

export function decodeCandles(buf: ArrayBuffer): Candle[] {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('bad magic: not an STK1 file');
  const n = dv.getUint32(4, true);
  const out: Candle[] = new Array(n);
  let tOff = 8;
  let pOff = 8 + n * 4;
  for (let i = 0; i < n; i++) {
    out[i] = {
      t: dv.getUint32(tOff, true),
      o: dv.getInt32(pOff, true) / 100,
      h: dv.getInt32(pOff + 4, true) / 100,
      l: dv.getInt32(pOff + 8, true) / 100,
      c: dv.getInt32(pOff + 12, true) / 100,
    };
    tOff += 4;
    pOff += 16;
  }
  return out;
}
