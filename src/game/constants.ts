export const WORLD_W = 450;
export const WORLD_H = 800;
export const PHYS_DT = 1 / 120;

export const GRAVITY = 2400;
export const FLAP_VY = -640;
export const MAX_FALL = 1150;

export const BIRD_X = 130;
export const BIRD_R = 20;

export const SCROLL_SPEED = 190;
export const OBSTACLE_SPACING = 250;
export const OBSTACLE_HALF_W = 30;

export const GAP_HALF_MAX = 130;
export const GAP_HALF_MIN = 84;
// extra narrowing on shock candles; calm gaps bottom out GAP_SHOCK above MIN
export const GAP_SHOCK = 12;
export const GAP_TIGHTEN_CANDLES = 120;
export const GAP_MARGIN = 90;
export const MAX_CENTER_STEP = 165;

// The bird may rise above the world top (top candles extend upward forever);
// it is held here instead of dying, like a ceiling of thin air.
export const CEILING = -60;

// Fairness: every screen sees at least VIEW_MIN world units of chart, and
// candles past FOG_FAR from the left edge dissolve into haze, so look-ahead
// is roughly the same on a phone and an ultrawide.
export const VIEW_MIN = 560;
export const FOG_NEAR = 860;
export const FOG_FAR = 1120;
