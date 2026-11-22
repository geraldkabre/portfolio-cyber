// CYBERVERSE playable characters: production files, credits and licence terms.
// Paths are relative to the web root (Vite serves public/ at /).
export const CLIPS_URL = '/assets/animations/ual-humanoid-clips.json';

export const CHARACTERS = {
  male: {
    id: 'cyber-jt',
    name: 'Cyber JT',
    url: '/assets/characters/cyber-jt/cyber-jt.cv.vrm',
    credit: '"Cyber JT" by Jonh Tinoco (VRoid Hub) — CYBERVERSE edition (outfit, materials and optimisation modified)',
    source: 'https://hub.vroid.com/characters/6630547218766236721/models/4402901750781022786',
    license: 'VRoid Hub conditions: commercial use allowed (personal & corporate), modification allowed, redistribution allowed, credit not required; violent and sexual expression NOT allowed',
    restrictions: ['no-violence', 'no-sexual-content'],
  },
  female: {
    id: 'neon-fighter',
    name: 'NEON FIGHTER +',
    url: '/assets/characters/neon-fighter/neon-fighter.cv.vrm',
    credit: '"NEON FIGHTER +" by Kanato (VRoid Hub) — CYBERVERSE edition (materials and optimisation modified)',
    source: 'https://hub.vroid.com/characters/1731822748557317042/models/1819146148563416740',
    license: 'VRoid Hub conditions: commercial use allowed (personal & corporate), modification allowed, redistribution allowed, credit not required',
    restrictions: [],
  },
};

/** Clips with no combat / weapon / injury content (Cyber JT's licence forbids violent expression). */
export const LOCOMOTION = { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop',
  jumpStart: 'Jump_Start', jumpLoop: 'Jump_Loop', jumpLand: 'Jump_Land', crouchIdle: 'Crouch_Idle_Loop', crouchWalk: 'Crouch_Fwd_Loop' };
