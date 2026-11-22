/**
 * Keyboard + mouse input for the third-person controller.
 * - Keys are tracked by `code` (layout independent: KeyW is the key at the W position, also Z on AZERTY).
 * - Mouse look uses pointer lock when available, with a click-and-drag fallback (and for automated tests).
 */
type Action = 'interact' | 'jump' | 'toggleWalk' | 'escape' | 'help' | 'debug' | 'map';

const ACTIONS: Record<string, Action> = {
  KeyE: 'interact', Enter: 'interact', Space: 'jump', KeyC: 'toggleWalk', Escape: 'escape', KeyH: 'help', F3: 'debug', KeyM: 'map',
};

export class Input {
  private readonly down = new Set<string>();
  private readonly listeners = new Map<Action, Set<() => void>>();
  private lookX = 0;
  private lookY = 0;
  private wheel = 0;
  private dragging = false;
  /** performance.now() of the last mouse-look movement (camera auto-follow waits for the mouse to rest). */
  lastLookAt = 0;
  enabled = false;
  /** Multiplier applied to mouse deltas (radians per pixel). */
  sensitivity = 0.0022;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    element.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  on(action: Action, fn: () => void) {
    if (!this.listeners.has(action)) this.listeners.set(action, new Set());
    this.listeners.get(action)!.add(fn);
    return () => this.listeners.get(action)!.delete(fn);
  }

  isDown(code: string) {
    return this.enabled && this.down.has(code);
  }

  /** Movement intent in camera space: x = right, y = forward, each in [-1, 1]. */
  moveVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    const f = (this.down.has('KeyW') || this.down.has('ArrowUp') ? 1 : 0) - (this.down.has('KeyS') || this.down.has('ArrowDown') ? 1 : 0);
    const r = (this.down.has('KeyD') || this.down.has('ArrowRight') ? 1 : 0) - (this.down.has('KeyA') || this.down.has('ArrowLeft') ? 1 : 0);
    const len = Math.hypot(f, r) || 1;
    return { x: r / len, y: f / len };
  }

  get sprint() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  /** Consumes the accumulated look delta (radians). */
  consumeLook() {
    const d = { x: this.lookX * this.sensitivity, y: this.lookY * this.sensitivity };
    this.lookX = 0;
    this.lookY = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  get pointerLocked() {
    return document.pointerLockElement === this.element;
  }

  requestPointerLock() {
    if (!this.enabled || this.pointerLocked) return;
    try {
      const p = this.element.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => undefined);
    } catch { /* not supported: drag-to-look fallback */ }
  }

  exitPointerLock() {
    if (this.pointerLocked) document.exitPointerLock();
  }

  private emit(a: Action) {
    this.listeners.get(a)?.forEach((fn) => fn());
  }

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && this.enabled) e.preventDefault();
    if (e.code === 'F3') e.preventDefault();
    const first = !this.down.has(e.code);
    this.down.add(e.code);
    const action = ACTIONS[e.code];
    if (action && first && !e.repeat) this.emit(action);
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  private readonly onBlur = () => {
    this.down.clear();
    this.dragging = false;
  };

  private readonly onMouseDown = (e: MouseEvent) => {
    if (!this.enabled) return;
    this.dragging = true;
    if (e.button === 0) this.requestPointerLock();
  };

  private readonly onMouseUp = () => {
    this.dragging = false;
  };

  private readonly onMouseMove = (e: MouseEvent) => {
    if (!this.enabled) return;
    if (this.pointerLocked || this.dragging) {
      this.lookX += e.movementX;
      this.lookY += e.movementY;
      if (e.movementX || e.movementY) this.lastLookAt = performance.now();
    }
  };

  private readonly onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    this.wheel += Math.sign(e.deltaY);
  };

  /** Test hook: inject a look delta in pixels. */
  injectLook(dx: number, dy: number) {
    this.lookX += dx;
    this.lookY += dy;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.element.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }
}
