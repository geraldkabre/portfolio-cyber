/**
 * Visionaries — the liquid-glass lens (docs/cyberverse/pantheon.md §7.2).
 *
 * Each disc is modelled as a glass slab (n = 1.5) whose top is flat in the middle and curves down to the backdrop
 * across a bezel band at the rim (convex squircle y = (1 − (1 − t)⁴)^¼). A straight-down ray is refracted with
 * Snell's law; its lateral landing offset is baked per pixel into a displacement map (R = x, G = y, around 128).
 * One SVG filter, shared by the nine discs through `backdrop-filter: url(#vis-glass)`, applies the map three times
 * (one pass per colour channel → chromatic fringes only where light bends) and is re-baked only on resize.
 */
import { VIS } from './geometry';

const SVG_NS = 'http://www.w3.org/2000/svg';
const N_GLASS = 1.5;
const N_AIR = 1;

export type GlassMode = 'native' | 'frost';

/**
 * Live SVG refraction in backdrop-filter only renders in Chromium. Safari and Firefox accept the property (and pass
 * @supports) but draw nothing, so the user agent decides; `?glass=native|frost` overrides it for testing.
 */
export function detectGlassMode(): GlassMode {
  const forced = new URLSearchParams(location.search).get('glass');
  if (forced === 'native' || forced === 'frost') return forced;
  const ua = navigator.userAgent;
  if (/Firefox\/|FxiOS/.test(ua)) return 'frost';
  // Every browser on iOS / iPadOS is WebKit.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'frost';
  const chromium = /(Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser)\/\d+/.test(ua);
  if (!chromium) return 'frost'; // Safari and unknown engines
  return typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url(#vis-glass)') ? 'native' : 'frost';
}

/** Convex squircle height profile (0 at the rim, 1 where the flat top starts) and its derivative. */
const profile = (t: number) => Math.pow(1 - Math.pow(1 - t, 4), 0.25);
const profileSlope = (t: number) => Math.pow(1 - t, 3) / Math.pow(1 - Math.pow(1 - t, 4), 0.75);

/**
 * Lateral displacement (px) of a vertical ray across the bezel, t = 0 at the rim → 1 at the flat top.
 * Snell: sin θ2 = (n_air / n_glass) · sin θ1, θ1 = angle of the surface normal; the refracted ray leaves the vertical
 * by θ1 − θ2 and travels down the local glass height h before reaching the backdrop.
 */
export function refractionProfile(bezel: number, thickness: number, samples = 256) {
  const mag = new Float32Array(samples + 1);
  let max = 0;
  for (let k = 0; k <= samples; k++) {
    const t = Math.max(1e-4, Math.min(1, k / samples));
    const h = thickness * profile(t);
    const slope = (thickness / bezel) * profileSlope(t);
    const theta1 = Math.atan(slope);
    const theta2 = Math.asin((N_AIR / N_GLASS) * Math.sin(theta1));
    const m = h * Math.tan(theta1 - theta2);
    mag[k] = m;
    if (m > max) max = m;
  }
  return { mag, max, samples };
}

/**
 * Bakes the displacement map for a d0 × d0 disc. Vectors point towards the centre (a convex lens samples the
 * backdrop from further in), normalised so that ±maxDisplacement maps to 128 ± 127.
 */
export function bakeDisplacementMap(d0: number, resolution = 2) {
  const size = Math.max(8, Math.round(d0 * resolution));
  const bezel = d0 * VIS.BEZEL_RATIO;
  const { mag, max, samples } = refractionProfile(bezel, VIS.THICKNESS);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const R = d0 / 2;
  const k = d0 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) * k - R;
      const py = (y + 0.5) * k - R;
      const r = Math.hypot(px, py);
      let vx = 0;
      let vy = 0;
      const fromRim = R - r;
      if (r > 1e-3 && fromRim >= 0 && fromRim < bezel) {
        const m = mag[Math.round((fromRim / bezel) * samples)] / max;
        vx = (-px / r) * m;
        vy = (-py / r) * m;
      }
      const o = (y * size + x) * 4;
      img.data[o] = Math.round(128 + 127 * vx);
      img.data[o + 1] = Math.round(128 + 127 * vy);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // feDisplacementMap: P'(x) = P(x + scale · (C/255 − 0.5)) → ±127/255 ≈ ±0.498 of the scale.
  return { url: canvas.toDataURL('image/png'), baseScale: (max / (127 / 255)), maxDisplacement: max };
}

/** The single shared filter (§7.2). */
export class GlassFilter {
  readonly svg: SVGSVGElement;
  private readonly image: SVGFEImageElement;
  private readonly maps: SVGFEDisplacementMapElement[] = [];
  private baseScale = 0;
  private lastWob = NaN;
  d0 = 0;

  constructor(readonly id = 'vis-glass') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'vis-defs');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', '100%');
    filter.setAttribute('height', '100%');
    filter.setAttribute('color-interpolation-filters', 'sRGB'); // mandatory: the map is linear data, not colour
    const image = document.createElementNS(SVG_NS, 'feImage');
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('preserveAspectRatio', 'none');
    image.setAttribute('result', 'map');
    filter.appendChild(image);
    // One displacement pass per channel, each isolated by a colour matrix, then screen-blended back together.
    const isolate = ['1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'];
    ['r', 'g', 'b'].forEach((c, i) => {
      const d = document.createElementNS(SVG_NS, 'feDisplacementMap');
      d.setAttribute('in', 'SourceGraphic');
      d.setAttribute('in2', 'map');
      d.setAttribute('xChannelSelector', 'R');
      d.setAttribute('yChannelSelector', 'G');
      d.setAttribute('result', `d${c}`);
      const m = document.createElementNS(SVG_NS, 'feColorMatrix');
      m.setAttribute('in', `d${c}`);
      m.setAttribute('type', 'matrix');
      m.setAttribute('values', isolate[i]);
      m.setAttribute('result', c);
      filter.append(d, m);
      this.maps.push(d);
    });
    const rg = document.createElementNS(SVG_NS, 'feBlend');
    rg.setAttribute('in', 'r');
    rg.setAttribute('in2', 'g');
    rg.setAttribute('mode', 'screen');
    rg.setAttribute('result', 'rg');
    const rgb = document.createElementNS(SVG_NS, 'feBlend');
    rgb.setAttribute('in', 'rg');
    rgb.setAttribute('in2', 'b');
    rgb.setAttribute('mode', 'screen');
    filter.append(rg, rgb);
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.appendChild(filter);
    svg.appendChild(defs);
    this.svg = svg;
    this.image = image;
  }

  /** (Re)bakes the map for the current disc box; cheap enough to run on a debounced resize. */
  bake(d0: number) {
    if (d0 === this.d0) return;
    this.d0 = d0;
    const res = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const map = bakeDisplacementMap(d0, res);
    this.image.setAttribute('href', map.url);
    this.image.setAttribute('width', String(d0));
    this.image.setAttribute('height', String(d0));
    this.baseScale = map.baseScale;
    this.lastWob = NaN;
    this.apply(1);
  }

  /** Per-channel scales: R over-refracts, B under-refracts by 5 % × chroma; all breathe with the wobble. */
  apply(wob: number) {
    if (Math.abs(wob - this.lastWob) < 0.004) return;
    this.lastWob = wob;
    const c = 0.05 * VIS.CHROMA;
    const s = this.baseScale * wob;
    this.maps[0].setAttribute('scale', (s * (1 + c)).toFixed(2));
    this.maps[1].setAttribute('scale', s.toFixed(2));
    this.maps[2].setAttribute('scale', (s * (1 - c)).toFixed(2));
  }

  get scales() {
    return this.maps.map((m) => Number(m.getAttribute('scale')));
  }
}
