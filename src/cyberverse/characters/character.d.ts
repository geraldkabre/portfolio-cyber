import type * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

export interface HumanoidClipData {
  fps: number;
  hipsRestHeight: number;
  bones: string[];
  clips: Record<string, { duration: number; frames: number; loop: boolean; ground: 'feet' | 'min' | 'none' }>;
}

export interface CharacterHandle {
  vrm: VRM;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
  actions: Map<string, THREE.AnimationAction>;
  readonly current: THREE.AnimationAction | null;
  play(name: string, opts?: { fade?: number; timeScale?: number }): THREE.AnimationAction;
  update(dt: number): void;
  dispose(): void;
}

export function loadClipData(url: string): Promise<HumanoidClipData>;
export function loadCharacter(
  url: string,
  clipData: HumanoidClipData,
  opts?: { onProgress?: (e: ProgressEvent) => void; clips?: string[] },
): Promise<CharacterHandle>;
