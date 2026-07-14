export function getBest(symbol: string, tf: string): number {
  try {
    return Number(localStorage.getItem(`stochastick.best.${symbol}.${tf}`)) || 0;
  } catch {
    return 0;
  }
}

export function setBest(symbol: string, tf: string, score: number): void {
  try {
    if (score > getBest(symbol, tf)) localStorage.setItem(`stochastick.best.${symbol}.${tf}`, String(score));
  } catch { /* private mode: scores just don't persist */ }
}

export function getFighter(): 'bull' | 'bear' {
  try {
    return localStorage.getItem('stochastick.fighter') === 'bear' ? 'bear' : 'bull';
  } catch {
    return 'bull';
  }
}

export function setFighter(f: 'bull' | 'bear'): void {
  try {
    localStorage.setItem('stochastick.fighter', f);
  } catch { /* private mode: choice just doesn't persist */ }
}
