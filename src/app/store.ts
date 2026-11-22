import { useSyncExternalStore } from 'react';
import type { QualityLevel } from '../engine/quality';

export type Phase = 'boot' | 'loading' | 'select' | 'entering' | 'play' | 'error';
export type OperatorId = 'female' | 'male';
export type PanelId = 'dossier' | 'brief' | 'help' | null;

export interface UIState {
  phase: Phase;
  progress: number;
  progressLabel: string;
  error: string | null;
  hovered: OperatorId;
  selected: OperatorId | null;
  prompt: string | null;
  panel: PanelId;
  location: string;
  walkMode: boolean;
  pointerLocked: boolean;
  quality: QualityLevel;
  flash: number;
  debug: boolean;
  fps: number;
  frameMs: number;
  drawCalls: number;
}

type Listener = () => void;

/** Minimal external store shared by the engine (writer) and the React UI (reader). */
class Store {
  private state: UIState = {
    phase: 'boot', progress: 0, progressLabel: '', error: null, hovered: 'female', selected: null, prompt: null,
    panel: null, location: 'NEXUS PRIME', walkMode: false, pointerLocked: false, quality: 'high', flash: 0, debug: false,
    fps: 0, frameMs: 0, drawCalls: 0,
  };
  private listeners = new Set<Listener>();

  get = () => this.state;

  set(patch: Partial<UIState>) {
    let changed = false;
    for (const k in patch) {
      if (this.state[k as keyof UIState] !== patch[k as keyof UIState]) { changed = true; break; }
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export const store = new Store();

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
