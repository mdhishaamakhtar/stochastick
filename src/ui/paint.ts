import { renderFighter, type Fighter } from '../render/fighters.ts';

/** Svelte action: paint a fighter head into a canvas sized by CSS. */
export function paintFighter(node: HTMLCanvasElement, f: Fighter) {
  const draw = (fighter: Fighter) => {
    const css = node.clientWidth || 48;
    const img = renderFighter(fighter, css * (window.devicePixelRatio || 1) * 1.25);
    node.width = img.width;
    node.height = img.height;
    node.getContext('2d')!.drawImage(img, 0, 0);
  };
  draw(f);
  return { update: draw };
}
