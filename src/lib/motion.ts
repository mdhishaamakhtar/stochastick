const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = (): boolean => query.matches;
export const onReducedMotionChange = (fn: () => void): void => query.addEventListener('change', fn);
