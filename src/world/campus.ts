/**
 * Campus layout shared by the 3D world and the UI map (plain data, no Three.js import).
 * Azimuth in degrees from north, clockwise (north = -Z, east = +X). Nexus Prime is at the origin.
 */
export interface Site {
  id: 'academy' | 'soc' | 'missions' | 'research' | 'vault' | 'comms';
  az: number;
  dist: number;
  y: number;
  color: string;
  short: string;
}

export const SITES: Site[] = [
  { id: 'soc', az: 30, dist: 170, y: 4, color: '#2f7bff', short: 'SOC' },
  { id: 'academy', az: 90, dist: 150, y: -2, color: '#00e5ff', short: 'Academy' },
  { id: 'comms', az: 140, dist: 165, y: 6, color: '#00e5ff', short: 'Comms' },
  { id: 'vault', az: 220, dist: 170, y: -4, color: '#8b5cff', short: 'Vault' },
  { id: 'research', az: 270, dist: 150, y: 5, color: '#ddf6ff', short: 'Research' },
  { id: 'missions', az: 330, dist: 165, y: 0, color: '#8b5cff', short: 'Missions' },
];

/** Radius of the portal ring on Nexus Prime. */
export const PORTAL_RING = 25.5;

export const siteXZ = (az: number, dist: number) => {
  const a = (az * Math.PI) / 180;
  return { x: Math.sin(a) * dist, z: -Math.cos(a) * dist };
};
