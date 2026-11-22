import type { Game } from '../game/Game';

/** The UI talks to the (lazily loaded) game through this bridge; Three.js stays out of the UI bundle. */
export const bridge: { game: Game | null } = { game: null };
