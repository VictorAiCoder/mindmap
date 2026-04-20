export const NODE_SCALE = {
  MIN: 0.75,
  MAX: 2.5,
  DEFAULT: 1,
  STEP: 0.05,
  SNAP_THRESHOLD: 0.08,
  /** Сопротивление global zoom. 0 = нет, 1 = очень сильное. 0.4 — умеренное. */
  ZOOM_RESISTANCE: 0.4,
} as const