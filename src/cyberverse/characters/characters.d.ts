export interface CharacterEntry {
  id: string;
  name: string;
  url: string;
  credit: string;
  source: string;
  license: string;
  restrictions: string[];
}

export const CLIPS_URL: string;
export const CHARACTERS: { male: CharacterEntry; female: CharacterEntry };
export const LOCOMOTION: {
  idle: string; walk: string; run: string; sprint: string;
  jumpStart: string; jumpLoop: string; jumpLand: string; crouchIdle: string; crouchWalk: string;
};
