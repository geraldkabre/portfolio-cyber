import * as THREE from 'three';

/**
 * CYBERVERSE art-direction palette (sRGB hex). Same values as the character texture bake
 * (tools/char-lab/studio/bake.js GLSL_LIB) so the world and the two characters share one colour language.
 */
export const PALETTE = {
  navy950: '#070b18',
  navy900: '#0b1326',
  navy800: '#121d38',
  slate: '#1e2a48',
  steel: '#3a4868',
  cyan: '#00e5ff',
  eblue: '#2f7bff',
  violet: '#8b5cff',
  ice: '#ddf6ff',
} as const;

export type PaletteKey = keyof typeof PALETTE;

export const color = (key: PaletteKey) => new THREE.Color(PALETTE[key]);
