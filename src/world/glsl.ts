/** Shared GLSL helpers (value noise, fbm, hashes, palette) for the procedural world shaders. */
export const GLSL_COMMON = /* glsl */ `
#define CV_NAVY950 vec3(0.0021, 0.0033, 0.0091)
#define CV_NAVY900 vec3(0.0034, 0.0065, 0.0194)
#define CV_NAVY800 vec3(0.0062, 0.0123, 0.0395)
#define CV_CYAN    vec3(0.0, 0.7835, 1.0)
#define CV_EBLUE   vec3(0.0284, 0.1981, 1.0)
#define CV_VIOLET  vec3(0.2582, 0.1022, 1.0)
#define CV_ICE     vec3(0.7230, 0.9216, 1.0)

float cvHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float cvHash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 cvHash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float cvNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cvHash12(i), cvHash12(i + vec2(1, 0)), u.x), mix(cvHash12(i + vec2(0, 1)), cvHash12(i + vec2(1, 1)), u.x), u.y);
}
float cvNoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = cvHash13(i), n100 = cvHash13(i + vec3(1,0,0)), n010 = cvHash13(i + vec3(0,1,0)), n110 = cvHash13(i + vec3(1,1,0));
  float n001 = cvHash13(i + vec3(0,0,1)), n101 = cvHash13(i + vec3(1,0,1)), n011 = cvHash13(i + vec3(0,1,1)), n111 = cvHash13(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float cvFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * cvNoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
float cvFbm3(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * cvNoise3(p); p = p * 2.02 + vec3(11.3, 7.1, 3.7); a *= 0.5; } return s; }
// Anti-aliased thin line: distance d to a line, half width w.
float cvLine(float d, float w) { float fw = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w - fw, w + fw, abs(d)); }
`;
