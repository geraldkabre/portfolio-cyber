import * as THREE from 'three';

/**
 * Master layout of Nexus Prime (Milestone 3). North = -Z, east = +X, south = +Z.
 * All world modules read these numbers so architecture, colliders, spawn and interactions stay consistent.
 */
export const LAYOUT = {
  /** Walkable plaza ends at the curb's inner face. */
  plazaRadius: 31.0,
  curbTop: 0.35,
  railRadius: 31.62,
  islandRadius: 32.2,
  plinthRadius: 11.5,
  plinthTop: 0.5,
  chamferOuter: 13.1,

  /** Command Center: 12-sided glass rotunda (MegaKit at 1.25x), entrance facing south. */
  cc: {
    scale: 1.25,
    sides: 12,
    sideLength: 5, // 4 m kit module x 1.25
    get inradius() { return this.sideLength / (2 * Math.tan(Math.PI / this.sides)); },
    tier1Height: 3.19 * 1.25,
  },

  spawn: new THREE.Vector3(0, 0, 25),
  spawnYaw: Math.PI, // facing north, toward the Command Center

  /** East gate to the Identity & Academy District outpost. */
  portal: new THREE.Vector3(26.0, 0, 0),
  outpost: new THREE.Vector3(96, -7, -14),
} as const;
