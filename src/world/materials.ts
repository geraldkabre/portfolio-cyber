import * as THREE from 'three';
import { PALETTE } from './palette';

/**
 * Art-directed material library for the environment kits.
 *
 * The kit GLBs carry geometry and the ORIGINAL material names only (see tools/env-build/build-kit.mjs).
 * Every name is mapped here to a shared CYBERVERSE material: navy/steel trims, ice ceramic panels,
 * cyan light emitters and electric-blue accents driven by the MegaKit masks
 * (mask.r = light emitters, mask.g = accent paint).
 */
export type TextureTier = '2k' | '1k';

const TEX_ROOT = '/assets/environments/megakit/textures/';

interface TrimSpec {
  base: string;
  normal: string;
  orm: string;
  mask?: string;
  tint: string;
  accent?: string;
  accentGlow?: number;
  lightGlow?: number;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  envMapIntensity?: number;
}

export class MaterialLibrary {
  private readonly loader = new THREE.TextureLoader();
  private readonly textures = new Map<string, THREE.Texture>();
  private readonly pending: Promise<unknown>[] = [];
  private readonly factories = new Map<string, () => THREE.Material>();
  private readonly built = new Map<() => THREE.Material, THREE.Material>();
  private readonly fallback = new THREE.MeshStandardMaterial({ color: '#ff00ff', name: 'missing' });
  readonly missing = new Set<string>();

  constructor(private readonly tier: TextureTier, private readonly anisotropy: number) {
    this.build();
  }

  /** Resolves when every texture is decoded (call before the first render to avoid pop-in). */
  ready(): Promise<void> {
    return Promise.all(this.pending).then(() => undefined);
  }

  get(name: string): THREE.Material {
    const f = this.factories.get(name) ?? this.factories.get(name.replace(/\.\d+$/, ''));
    if (!f) {
      this.missing.add(name);
      return this.fallback;
    }
    let m = this.built.get(f);
    if (!m) {
      m = f();
      this.built.set(f, m);
    }
    return m;
  }

  /** Shared material by role, for procedural geometry that must match the kit. */
  role(name: 'hull' | 'floor' | 'panel' | 'ceramic' | 'glass' | 'light' | 'black' | 'accent'): THREE.Material {
    const map = { hull: 'MI_Trim_01', floor: 'MI_Trim_03', panel: 'MI_Trim_02', ceramic: 'MI_Trim_02_Variation',
      glass: 'M_Glass', light: 'M_Light', black: 'M_Black', accent: 'MI_Decal_Line' } as const;
    return this.get(map[name]);
  }

  tex(file: string, srgb: boolean, tier: TextureTier = this.tier): THREE.Texture {
    // Data maps and rarely seen sheets only exist at 1K (see tools/env-build/build-kit.mjs).
    if (/_orm$|^padded_normal$|^padded_mask$|^decals$|^trim03_cables$/.test(file)) tier = '1k';
    const key = `${tier}/${file}`;
    let t = this.textures.get(key);
    if (t) return t;
    const url = `${TEX_ROOT}${tier}/${file}.webp`;
    let done!: () => void;
    let fail!: (e: unknown) => void;
    this.pending.push(new Promise<void>((res, rej) => { done = res; fail = rej; }));
    t = this.loader.load(url, () => done(), undefined, (e) => fail(new Error(`texture ${url}: ${String(e)}`)));
    t.flipY = false; // glTF UV convention
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = this.anisotropy;
    this.textures.set(key, t);
    return t;
  }

  private trim(name: string, s: TrimSpec): THREE.MeshStandardMaterial {
    // ORM maps are always 1K: roughness/AO detail does not need 2K and it saves ~5 MB of download.
    const orm = this.tex(s.orm, false, '1k');
    const m = new THREE.MeshStandardMaterial({
      name,
      map: this.tex(s.base, true),
      normalMap: this.tex(s.normal, false),
      normalScale: new THREE.Vector2(s.normalScale ?? 1, s.normalScale ?? 1),
      roughnessMap: orm,
      metalnessMap: orm,
      aoMap: orm,
      aoMapIntensity: 0.85,
      color: new THREE.Color(s.tint),
      roughness: s.roughness ?? 1,
      metalness: s.metalness ?? 1,
      envMapIntensity: s.envMapIntensity ?? 1,
      side: THREE.DoubleSide, // MegaKit panels are single-sided (authored doubleSided)
    });
    if (s.mask) {
      const mask = this.tex(s.mask, false);
      const uniforms = {
        uMask: { value: mask },
        uAccent: { value: new THREE.Color(s.accent ?? PALETTE.eblue) },
        uAccentGlow: { value: s.accentGlow ?? 0.6 },
        uLight: { value: new THREE.Color(PALETTE.cyan) },
        uLightGlow: { value: s.lightGlow ?? 3.0 },
      };
      m.userData.kitUniforms = uniforms;
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
uniform sampler2D uMask; uniform vec3 uAccent; uniform float uAccentGlow; uniform vec3 uLight; uniform float uLightGlow;`)
          .replace('#include <map_fragment>', `#include <map_fragment>
vec3 cvMask = texture2D(uMask, vMapUv).rgb;
diffuseColor.rgb = mix(diffuseColor.rgb, uAccent * 0.25, cvMask.g);`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += uAccent * (cvMask.g * uAccentGlow) + uLight * (cvMask.r * uLightGlow);`);
      };
      m.customProgramCacheKey = () => 'cv-kit-mask';
    }
    return m;
  }

  private build() {
    // Materials are created lazily on first use (only the textures of pieces actually shipped are downloaded).
    const add = (names: string[], factory: () => THREE.Material) => names.forEach((n) => this.factories.set(n, factory));

    // Structural metal (frames, columns, wall bodies): deep navy steel.
    add(['MI_Trim_01'], () => this.trim('kit/trim01', { base: 'trim01_base', normal: 'trim01_normal', orm: 'trim01_orm', mask: 'trim01_mask',
      tint: '#8796bd', accentGlow: 0.9, lightGlow: 3.2 }));
    add(['MI_Trim_01_Floor', 'MI_Trim_01_Stairs'], () => this.trim('kit/trim01-floor', { base: 'trim01_base', normal: 'trim01_normal', orm: 'trim01_orm', mask: 'trim01_mask',
      tint: '#6f7ea3', accentGlow: 0.5, lightGlow: 2.2 }));

    // Wall panels: slightly lighter cool steel, electric-blue accent stripes.
    add(['MI_Trim_02', 'MI_Trim_02_Rails'], () => this.trim('kit/trim02', { base: 'trim02_base', normal: 'trim02_normal', orm: 'trim02_orm', mask: 'trim02_mask',
      tint: '#97a6c9', accentGlow: 0.55 }));
    add(['MI_Trim_02_Floor'], () => this.trim('kit/trim02-floor', { base: 'trim02_base', normal: 'trim02_normal', orm: 'trim02_orm', mask: 'trim02_mask',
      tint: '#7584a8', accentGlow: 0.35 }));
    // Ceramic "premium" panels: ice-white plastic for contrast with the navy metal.
    add(['MI_Trim_02_Variation'], () => this.trim('kit/ceramic', { base: 'trim02_base', normal: 'trim02_normal', orm: 'trim02_orm', mask: 'trim02_mask',
      tint: '#e6eefc', accent: PALETTE.cyan, accentGlow: 0.8, metalness: 0.15, roughness: 0.9 }));

    // Plain metal and cable trims.
    add(['MI_Trim_03'], () => this.trim('kit/trim03', { base: 'trim03_base', normal: 'trim03_normal', orm: 'trim03_orm', tint: '#7a87a8' }));
    add(['MI_Trim_03_Dark', 'MI_Trim_03_Cables'], () => this.trim('kit/trim03-dark', { base: 'trim03_cables', normal: 'trim03_normal', orm: 'trim03_orm', tint: '#5d6884' }));
    add(['MI_Trim_03_Cables_Blue'], () => this.trim('kit/trim03-blue', { base: 'trim03_cables', normal: 'trim03_normal', orm: 'trim03_orm', tint: '#4f7ad8' }));

    // Padded acoustic wall with cyan seams.
    add(['MI_PaddedWall'], () => this.trim('kit/padded', { base: 'padded_base', normal: 'padded_normal', orm: 'padded_orm', mask: 'padded_mask',
      tint: '#56648a', lightGlow: 2.0, metalness: 0.3 }));

    // Decals (atlas with alpha cut-out).
    const decal = (name: string, col: string, glow: number) => new THREE.MeshStandardMaterial({
      name, map: this.tex('decals', true), color: col, emissive: col, emissiveMap: this.tex('decals', true), emissiveIntensity: glow,
      alphaTest: 0.5, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    add(['M_Decal_White'], () => decal('kit/decal-ice', PALETTE.ice, 0.15));
    add(['MI_Decal_Red'], () => decal('kit/decal-accent', PALETTE.eblue, 0.6));
    add(['MI_Decal_Grey'], () => decal('kit/decal-grey', '#4a5878', 0.0));
    add(['M_Decal_Screen'], () => decal('kit/decal-screen', PALETTE.cyan, 1.6));

    // Emitters and simple surfaces.
    add(['M_Light'], () => new THREE.MeshStandardMaterial({ name: 'kit/light', color: '#000000', emissive: '#a9ecff', emissiveIntensity: 1.7 }));
    add(['Light'], () => new THREE.MeshStandardMaterial({ name: 'cp/lantern', color: '#000000', emissive: '#8be8ff', emissiveIntensity: 0.85 }));
    add(['MI_Decal_Line'], () => new THREE.MeshStandardMaterial({ name: 'kit/line', color: '#000000', emissive: PALETTE.cyan, emissiveIntensity: 2.4 }));
    add(['M_LightFade_Red'], () => new THREE.MeshStandardMaterial({ name: 'kit/fade', color: '#000000', emissive: PALETTE.violet, emissiveIntensity: 1.8 }));
    add(['M_Black'], () => new THREE.MeshStandardMaterial({ name: 'kit/black', color: '#05070d', roughness: 0.35, metalness: 0.6 }));
    add(['M_Glass'], () => new THREE.MeshStandardMaterial({
      name: 'kit/glass', color: '#2f6fb0', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.22,
      emissive: '#0e4a86', emissiveIntensity: 0.55,
      depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide,
    }));

    // Cyberpunk Game Kit flat colours -> CYBERVERSE palette.
    const flat = (name: string, col: string, metal: number, rough: number, emissive?: string, glow = 0) => new THREE.MeshStandardMaterial({
      name, color: col, metalness: metal, roughness: rough, emissive: emissive ?? '#000000', emissiveIntensity: glow,
    });
    add(['Grey', 'Main2', 'Material.002'], () => flat('cp/navy-metal', '#2a3858', 0.55, 0.42));
    add(['LightGrey'], () => flat('cp/slate', '#46557a', 0.45, 0.5));
    add(['DarkGrey', 'Dark', 'Material.003', 'Edge', 'Material.004'], () => flat('cp/dark', '#121a2c', 0.5, 0.45));
    add(['Black'], () => flat('cp/black', '#06080f', 0.3, 0.5));
    add(['Orange', 'Main', 'Material.001'], () => flat('cp/accent', '#2a62e8', 0.35, 0.35, PALETTE.eblue, 0.25));
    add(['MetalLight'], () => flat('cp/metal-light', '#8a97b6', 0.85, 0.3));
    add(['Screen'], () => flat('cp/screen', '#07121f', 0.2, 0.15, PALETTE.cyan, 0.55));
    add(['Eye', 'Material', 'Red'], () => flat('cp/eye', '#000000', 0, 0.4, PALETTE.cyan, 3.0));
    add(['LightGreen', 'Green', 'Gold'], () => flat('cp/glow', '#000000', 0, 0.4, PALETTE.cyan, 1.5));
    add(['Texture_Signs', 'Texture_Transparent'], () => flat('cp/sign', '#050912', 0.1, 0.3, PALETTE.eblue, 0.9));
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    this.built.forEach((m) => m.dispose());
  }
}
