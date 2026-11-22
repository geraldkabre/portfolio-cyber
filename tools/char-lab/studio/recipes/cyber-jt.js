// CYBERVERSE edition of "Cyber JT" (VRoid Hub, Jonh Tinoco — modification and redistribution allowed by its licence).
// Casual hoodie + jeans -> hooded techwear shell + technical cargo trousers, designed in 3D body space and baked to UV.
import { bakeMaterial, applyToon, finalize } from './common.js';

const f = (x) => Number(x).toFixed(4);

export async function run(ctx) {
  const { bones: b, doc, V } = ctx;
  const D = `
#define PI 3.14159265
#define SH_Y ${f(b.leftUpperArm[1])}
#define ARM_Z ${f(b.leftUpperArm[2])}
#define UCH_Y ${f(b.upperChest[1])}
#define NECK_Y ${f(b.neck[1])}
#define HEAD_P vec3(0.0, ${f(b.head[1] + 0.06)}, ${f(b.head[2])})
#define LEG_X ${f(b.leftUpperLeg[0])}
#define LEG_Z ${f(b.leftLowerLeg[2])}
#define KNEE_Y ${f(b.leftLowerLeg[1])}
#define SLEEVE_X 0.190
#define YOKE_END_X 0.330
#define CUFF_X 0.572
#define STRAP_X 0.505
#define HEM_Y 0.915
#define LOGO_UV vec2(0.566, 0.600)
float fabricGrid(vec2 q, float s, float w) { vec2 g = abs(fract(q / s + 0.5) - 0.5) * s; return max(band(g.x, w), band(g.y, w)); }
`;

  // ---------------------------------------------------------------- hooded techwear shell
  const TOP = D + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  float ax = abs(P.x);
  bool sleeve = ax > SLEEVE_X;
  vec2 ac = vec2(P.y - SH_Y, P.z - ARM_Z);
  float th = atan(ac.y, ac.x);          // angle around the arm: 0 = top, +PI/2 = front
  float rr = max(length(ac), 0.02);
  bool hood = uv.x > 0.23 && uv.x < 0.77 && uv.y < 0.415;
  bool cords = (abs(uv.x - 0.347) < 0.013 || abs(uv.x - 0.648) < 0.013) && uv.y > 0.405 && uv.y < 0.545;
  bool front = N.z > 0.30, back = N.z < -0.35;

  // low-frequency folds from the original texture; logo and tribal print removed by the blur + logo mask
  float ls = lum(soft.rgb), lsh = lum(base.rgb);
  float logo = 1.0 - smoothstep(0.028, 0.05, distance(uv, LOGO_UV));
  ls = mix(ls, 0.19, logo); lsh = mix(lsh, 0.19, logo);
  float shade = clamp(1.0 + (ls - 0.19) * 2.0, 0.86, 1.22);
  float detail = clamp(lsh - ls, -0.08, 0.08);

  vec2 fq = sleeve ? vec2(P.x, th * rr) : (abs(N.x) > abs(N.z) ? vec2(P.z, P.y) : vec2(P.x, P.y));
  vec3 c = NAVY_900 * shade + ICE * 0.020 * fabricGrid(fq, 0.007, 0.00035);   // ripstop shell

  float yokeY = UCH_Y + 0.030 - 0.30 * max(0.0, 0.14 - ax);
  bool cuff = sleeve && ax > CUFF_X;
  bool hem = !sleeve && P.y < HEM_Y;
  bool yoke = !hood && ((!sleeve && P.y > yokeY) || (sleeve && ax < YOKE_END_X && abs(th) < 1.15));
  bool side = !sleeve && !hem && !yoke && !hood && abs(N.x) > 0.72;

  float cyanM = 0.0, violetM = 0.0, blueM = 0.0, iceM = 0.0;

  if (yoke) c = NAVY_950 * 1.15 * shade + ICE * 0.045 * band(hexGrid(fq, 0.011), 0.00035);
  if (side) c = SLATE * 0.72 * shade * (1.0 - 0.18 * band(fract(fq.x / 0.006 + 0.5) - 0.5, 0.12));
  if (!hood && !sleeve) cyanM = max(cyanM, band(P.y - yokeY, 0.0018));
  if (!hood && sleeve && ax < YOKE_END_X) cyanM = max(cyanM, band((abs(th) - 1.15) * rr, 0.0018));
  if (!hood && sleeve && abs(th) < 1.15) cyanM = max(cyanM, band(ax - YOKE_END_X, 0.0018));

  // sleeves: outer stripe, forearm strap with LEDs, reflective barcode label, cuff
  float sd = th * rr;
  if (sleeve && ax > YOKE_END_X && !cuff) {
    if (abs(sd) < 0.011) c = mix(c, EBLUE * 0.42, 1.0);
    cyanM = max(cyanM, band(sd, 0.0012));
    float strap = band(ax - STRAP_X, 0.0065);
    c = mix(c, vec3(0.10, 0.11, 0.15) * (1.0 + 0.3 * band(fract(fq.y / 0.004 + 0.5) - 0.5, 0.2)), strap);
    float led = band(length(vec2(ax - STRAP_X, sd - 0.02)), 0.0022) + band(length(vec2(ax - STRAP_X, sd + 0.02)), 0.0022);
    blueM = max(blueM, led);
    if (P.x > 0.0 && th > 0.70 && th < 1.25 && ax > 0.415 && ax < 0.47) {
      float bar = step(0.42, hash12(vec2(floor(ax * 520.0), 3.0)));
      iceM = max(iceM, bar * 0.85);
    }
  }
  if (cuff) { c = NAVY_950 * (1.0 + detail * 3.0); }
  if (sleeve) cyanM = max(cyanM, band(ax - CUFF_X, 0.0014));

  // hem ribbing
  if (hem) c = NAVY_950 * (1.0 + detail * 3.0);
  if (!sleeve && !hood) violetM = max(violetM, band(P.y - HEM_Y, 0.0015));

  // centre-front zip (turns the pullover into a shell jacket)
  if (front && !sleeve && !hood && ax < 0.011 && P.y < NECK_Y + 0.02) {
    c = vec3(0.09, 0.10, 0.13);
    float teeth = step(0.5, fract(P.y / 0.003 + (P.x > 0.0 ? 0.5 : 0.0))) * step(ax, 0.0045);
    c = mix(c, vec3(0.30, 0.33, 0.40), teeth);
  }
  if (front && !sleeve && !hood && P.y < NECK_Y + 0.02) cyanM = max(cyanM, band(P.x, 0.0007));

  // chest emblem (left chest): hexagon + double chevron
  if (front && !sleeve && !hood) {
    vec2 ep = vec2(P.x - 0.088, P.y - 1.262);
    float hx = sdHex(ep.yx, 0.027);
    if (hx < 0.0) c = NAVY_950 * 0.8;
    cyanM = max(cyanM, band(hx, 0.0011));
    float ch1 = min(sdSeg(ep, vec2(-0.012, 0.010), vec2(0.0, -0.004)), sdSeg(ep, vec2(0.0, -0.004), vec2(0.012, 0.010)));
    float ch2 = min(sdSeg(ep, vec2(-0.012, 0.000), vec2(0.0, -0.014)), sdSeg(ep, vec2(0.0, -0.014), vec2(0.012, 0.000)));
    violetM = max(violetM, band(ch1, 0.0016));
    cyanM = max(cyanM, band(ch2, 0.0010));
  }

  // back: circuit traces from the spine line into the yoke
  if (back && !sleeve && !hood && !hem && P.y < yokeY) {
    vec2 bp = vec2(ax, P.y);
    float t = sdSeg(bp, vec2(0.0, 0.99), vec2(0.0, yokeY));
    float t1 = min(sdSeg(bp, vec2(0.0, 1.10), vec2(0.055, 1.155)), sdSeg(bp, vec2(0.055, 1.155), vec2(0.055, 1.27)));
    float t2 = min(sdSeg(bp, vec2(0.0, 1.03), vec2(0.095, 1.125)), sdSeg(bp, vec2(0.095, 1.125), vec2(0.095, 1.21)));
    float nodes = min(abs(length(bp - vec2(0.055, 1.27)) - 0.005), abs(length(bp - vec2(0.095, 1.21)) - 0.005));
    cyanM = max(cyanM, band(t, 0.0012));
    blueM = max(blueM, max(max(band(t1, 0.0011), band(t2, 0.0011)), band(nodes, 0.0011)));
  }

  // hood: navy shell, violet lining facing the head, cyan centre seam
  if (hood) {
    float inner = step(0.25, dot(N, normalize(HEAD_P - P)));
    c = mix(NAVY_900 * shade + ICE * 0.04 * band(hexGrid(fq, 0.011), 0.00035), vec3(0.11, 0.06, 0.24) * shade, inner);
    cyanM = max(cyanM, band(P.x, 0.0015) * (1.0 - inner));
  }
  // drawcords: light-guide cords with metal tips
  if (cords) { bool tip = uv.y > 0.512; c = tip ? vec3(0.45, 0.50, 0.58) : EBLUE * 0.6; cyanM = tip ? 0.0 : 0.65; }

  col = c;
  col = mix(col, CYAN * 0.95, cyanM); col = mix(col, VIOLET, violetM); col = mix(col, EBLUE, blueM); col = mix(col, ICE * 0.8, iceM);
  emi = CYAN * cyanM + VIOLET * violetM * 0.95 + EBLUE * blueM * 0.9 + ICE * iceM * 0.08;
}`;

  // ---------------------------------------------------------------- technical cargo trousers
  const BOTTOM = D + /* glsl */`
#define BELT_Y 1.072
#define BUCKLE_Y 1.092
#define ANKLE_Y 0.132
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  float ax = abs(P.x);
  vec2 d2 = vec2(ax - LEG_X, P.z - LEG_Z);
  float ang = atan(d2.x, d2.y);          // 0 = front, +PI/2 = outer side (mirrored per leg)
  float rr = max(length(d2), 0.02);
  float arc = ang * rr;
  float ls = lum(soft.rgb), lsh = lum(base.rgb);
  float shade = clamp(1.0 + (ls - 0.15) * 2.0, 0.84, 1.2);
  float detail = clamp(lsh - ls, -0.08, 0.08);
  vec3 c = NAVY_950 * 1.3 * shade + ICE * 0.016 * fabricGrid(vec2(arc, P.y), 0.008, 0.0004);
  bool leg = P.y < 0.93;
  bool belt = P.y > BELT_Y;
  bool cuff = P.y < ANKLE_Y;
  float cyanM = 0.0, violetM = 0.0, blueM = 0.0, iceM = 0.0;

  // outer side stripe with light-guide core
  float sideD = (ang - PI * 0.5) * rr;
  if (!belt && !cuff && abs(sideD) < 0.011) c = EBLUE * 0.40;
  if (!belt && !cuff) cyanM = max(cyanM, band(sideD, 0.0012));
  // articulated knee panel with quilting and dashed stitching
  vec2 kp = vec2(arc, P.y - KNEE_Y);
  float kd = sdBox(kp, vec2(0.042, 0.080)) - 0.012;
  if (leg && kd < 0.0) c = SLATE * 0.55 * shade * (1.0 - 0.30 * band(fract(P.y / 0.02 + 0.5) - 0.5, 0.06));
  if (leg) blueM = max(blueM, band(kd + 0.004, 0.0007) * step(0.45, fract((P.y + arc) * 85.0)));
  // cargo pocket on the outer thigh, in front of the stripe
  vec2 pp = vec2((ang - (PI * 0.5 - 0.62)) * rr, P.y - 0.735);
  float pd = sdBox(pp, vec2(0.033, 0.064)) - 0.006;
  if (leg && pd < 0.0) c = NAVY_800 * shade * 0.95;
  if (leg && pd < 0.0) iceM = max(iceM, band(P.y - 0.782, 0.0010));
  if (leg) violetM = max(violetM, band(pd, 0.0012));
  // belt + buckle
  if (belt) c = vec3(0.07, 0.08, 0.11) * (1.0 + detail * 3.0);
  if (belt && P.z > 0.0) cyanM = max(cyanM, band(sdBox(vec2(P.x, P.y - BUCKLE_Y), vec2(0.022, 0.012)), 0.0014));
  // elastic ankle cuffs
  if (cuff) c = NAVY_950 * (1.0 + detail * 3.0);
  cyanM = max(cyanM, band(P.y - ANKLE_Y, 0.0012));

  col = c;
  col = mix(col, CYAN * 0.95, cyanM); col = mix(col, VIOLET, violetM); col = mix(col, EBLUE, blueM); col = mix(col, ICE * 0.75, iceM);
  emi = CYAN * cyanM * 0.95 + VIOLET * violetM * 0.85 + EBLUE * blueM * 0.6;
}`;

  // ---------------------------------------------------------------- sneakers
  const SHOES = D + /* glsl */`
#define SOLE_Y 0.026
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  float l = lum(base.rgb);
  vec3 c = mix(vec3(0.020, 0.026, 0.045), NAVY_800, smoothstep(0.05, 0.40, l));
  float white = smoothstep(0.55, 0.80, l);
  bool sole = P.y < SOLE_Y;
  c = mix(c, sole ? vec3(0.09, 0.10, 0.13) : ICE * 0.82, white);
  float line = band(P.y - SOLE_Y, 0.0016);
  float heel = (P.z < -0.055 && P.y > 0.045 && P.y < 0.11) ? 1.0 : 0.0;
  c = mix(c, EBLUE * 0.7, heel * (1.0 - white));
  col = mix(c, CYAN * 0.95, line);
  emi = CYAN * line + EBLUE * heel * (1.0 - white) * 0.35;
}`;

  // ---------------------------------------------------------------- glasses -> cyber specs
  const FRAME = D + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  float l = lum(base.rgb);
  col = mix(vec3(0.07, 0.08, 0.11), vec3(0.32, 0.36, 0.44), l);
  emi = mix(EBLUE, CYAN, 0.6) * 0.40;
}`;
  const LENS = D + /* glsl */`
void design(vec3 P, vec3 N, vec2 uv, vec4 base, vec4 soft, inout vec3 col, inout vec3 emi) {
  float t = smoothstep(1.56, 1.64, P.y);
  col = mix(VIOLET * 0.55, CYAN * 0.75, t);
  emi = col * 0.10;
}`;

  await bakeMaterial(ctx, { needle: 'Tops_01_CLOTH', design: TOP, toon: 'cloth', blurLod: 6 });
  await bakeMaterial(ctx, { needle: 'Bottoms_01_CLOTH', design: BOTTOM, toon: 'cloth', size: [2048, 2048], blurLod: 4 });
  await bakeMaterial(ctx, { needle: 'Shoes_01_CLOTH', design: SHOES, toon: 'cloth', size: [1024, 1024], blurLod: 3 });
  await bakeMaterial(ctx, { needle: 'GlassesLowFrame', design: FRAME, blurLod: 2 });
  await bakeMaterial(ctx, { needle: 'GlassesLowLens', design: LENS, blurLod: 2, alphaFn: (a) => (a > 0 ? 125 : 0) });
  for (const needle of ['Hair_00_HAIR', 'HairBack_00_HAIR']) applyToon(ctx, V.findMaterial(doc, needle), 'hair');

  // optimisation of untouched textures: body skin (mostly covered) 2048 -> 1024
  const bodyImg = V.mainImage(doc, V.findMaterial(doc, 'Body_00_SKIN'));
  const meta = V.vrmExt(doc).meta;
  await finalize(ctx, {
    outRel: P('out', 'characters/cyber-jt/cyber-jt.cv.vrm'),
    maxSize: { [bodyImg]: 1024 },
    meta: { title: 'Cyber JT — CYBERVERSE edition', version: 'cv-1.0', author: (meta.author || 'Jonh Tinoco') + ' (original); CYBERVERSE edit',
      reference: 'https://hub.vroid.com/characters/6630547218766236721/models/4402901750781022786' },
  });
}

function P(key, dflt) { return new URLSearchParams(location.search).get(key) || dflt; }
