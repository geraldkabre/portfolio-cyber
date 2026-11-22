/**
 * Visionaries — pure geometry and timing (no DOM). Every number comes from docs/cyberverse/pantheon.md (§5, §6, §10,
 * §11, §18). Kept free of side effects so the ring layout can be checked in isolation.
 */
export const VIS = {
  N: 9,
  INITIAL: 0,
  // ring + sizing
  RING_R: 0.34,
  RING_R_PHONE: 0.38,
  RING_CY: 0.055,
  CARD_FACTOR: 0.17,
  CARD_FACTOR_PHONE: 0.21,
  CARD_MIN: 60,
  CARD_MAX: 184,
  BASE_SCALE: 0.86,
  TOP_EMPHASIS: 0.32,
  LIFT: 7,
  PHONE_BELOW: 640,
  // glass
  FACE_INSET: 16,
  BEZEL_RATIO: 0.16,
  THICKNESS: 34,
  CHROMA: 2.2,
  WOBBLE: 0.38,
  // motion (seconds)
  ENTER_DELAY: 0.15,
  ENTER_BG_DUR: 2.0,
  ENTER_DUR: 2.7,
  ENTER_SPIN: 2.4,
  STEP_DUR: 1.0,
  KENBURNS: 34,
  // interaction
  DRAG_PER_STEP: 260,
  WHEEL_THRESHOLD: 88,
  WHEEL_GAP: 140,
  AUTO_TICK: 360,
  AUTO_INTERVAL: 3600,
  USER_IDLE: 4400,
  TAP_SLOP: 4,
} as const;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Signed shortest ring distance, wrapped to ±N/2 (§5). */
export function wrapOff(d: number, n: number = VIS.N) {
  let o = (((d % n) + n + n / 2) % n) - n / 2;
  if (o === -n / 2) o = n / 2;
  return o;
}

/** §11: holds, punches through the middle, holds. */
export function easeInOutExpo(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
}

export interface RingLayout {
  W: number;
  H: number;
  S: number;
  phone: boolean;
  ringRadius: number;
  ringCY: number;
  d0: number;
  /** Pixels of horizontal drag per slot (§12). */
  perStep: number;
}

/** §5 + §13: everything is sized off the shorter side, so the ring stays a circle on any aspect ratio. */
export function layout(W: number, H: number): RingLayout {
  const S = Math.min(W, H);
  const phone = S < VIS.PHONE_BELOW;
  return {
    W, H, S, phone,
    ringRadius: S * (phone ? VIS.RING_R_PHONE : VIS.RING_R),
    ringCY: H * VIS.RING_CY,
    d0: Math.round(clamp(S * (phone ? VIS.CARD_FACTOR_PHONE : VIS.CARD_FACTOR), VIS.CARD_MIN, VIS.CARD_MAX)),
    perStep: phone ? clamp(S * 0.38, 130, VIS.DRAG_PER_STEP) : VIS.DRAG_PER_STEP,
  };
}

export interface DiscState {
  off: number;
  bx: number;
  by: number;
  topness: number;
  scale: number;
  lift: number;
  z: number;
  /** Staggered entrance progress of this disc (1 = settled). */
  le: number;
}

/**
 * §5, §6, §10: position and emphasis of disc `i` for the carousel position `pos` and the entrance progress `enter`.
 * spin / er come from the entrance (0 rad and 1 at rest).
 */
export function discState(i: number, pos: number, L: RingLayout, enter: number, out: DiscState): DiscState {
  const N = VIS.N;
  const off = wrapOff(i - pos);
  const enterEased = smoothstep(clamp(enter, 0, 1));
  const spin = (1 - enterEased) * VIS.ENTER_SPIN;
  const er = 0.5 + 0.5 * enterEased;
  const ang = -Math.PI / 2 + off * ((Math.PI * 2) / N) + spin;
  const bx = Math.cos(ang) * L.ringRadius * er;
  const by = L.ringCY + Math.sin(ang) * L.ringRadius * er;
  const topness = smoothstep(clamp(1 - Math.abs(off), 0, 1));
  const stg = (clamp(Math.abs(off), 0, N / 2) / (N / 2)) * 0.5;
  const le = smoothstep(clamp((enter - stg) / (1 - stg), 0, 1));
  out.off = off;
  out.bx = bx;
  out.by = by;
  out.topness = topness;
  out.scale = (VIS.BASE_SCALE + VIS.TOP_EMPHASIS * topness) * (0.3 + 0.7 * le);
  out.lift = VIS.LIFT * topness;
  out.z = Math.round(100 + topness * 120 - by * 0.02);
  out.le = le;
  return out;
}

/** §4: backdrop cross-fade — the two layers bracketing a transition always sum to about 1 (no dark dip). */
export const backdropOpacity = (off: number) => clamp(1.05 - Math.abs(off), 0, 1);

/** §7.2: three layered swells → an organic, non-repeating ripple (t in ms). */
export const wobble = (t: number) =>
  1 + VIS.WOBBLE * (Math.sin(t * 0.0015) + 0.38 * Math.sin(t * 0.0034 + 1.2) + 0.22 * Math.sin(t * 0.0061 + 2.4));

/** Index of the scene at the top for a carousel position (flips at the half-way mark). */
export const focalIndex = (pos: number, n: number = VIS.N) => ((Math.round(pos) % n) + n) % n;
