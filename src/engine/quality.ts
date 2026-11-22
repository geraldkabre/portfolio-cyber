export type QualityLevel = 'high' | 'medium' | 'low';

export interface QualityPreset {
  level: QualityLevel;
  /** Upper bound of the device pixel ratio used for rendering. */
  maxPixelRatio: number;
  /** Shadow map size, 0 = no dynamic shadows. */
  shadowMapSize: 0 | 1024 | 2048;
  /** MSAA samples on the HDR render target (WebGL2). */
  msaa: 0 | 2 | 4;
  bloom: boolean;
  textureTier: '2k' | '1k';
  particles: number;
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  high: { level: 'high', maxPixelRatio: 1.5, shadowMapSize: 2048, msaa: 4, bloom: true, textureTier: '2k', particles: 1600 },
  medium: { level: 'medium', maxPixelRatio: 1.25, shadowMapSize: 1024, msaa: 2, bloom: true, textureTier: '1k', particles: 900 },
  low: { level: 'low', maxPixelRatio: 1, shadowMapSize: 0, msaa: 0, bloom: false, textureTier: '1k', particles: 400 },
};

/** GPU name as reported by WebGL (used only to pick a sensible default preset). */
export function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

/** Conservative first guess; the player can change it in the HUD (stored in localStorage). */
export function detectQuality(): QualityLevel {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const gpu = gpuName();
  if (coarse || mem <= 4 || /SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu)) return 'low';
  // Integrated / mobile-class GPUs: medium (adaptive resolution then keeps the frame rate up).
  if (/Intel|Iris|UHD|HD Graphics|Mali|Adreno|PowerVR|Radeon\(TM\) Graphics|Vega \d+ Graphics/i.test(gpu)) return 'medium';
  return 'high';
}

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
