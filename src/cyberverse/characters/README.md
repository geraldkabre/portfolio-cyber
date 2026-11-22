# CYBERVERSE characters (runtime)

Dependencies (tested versions): `three@0.169.0`, `@pixiv/three-vrm@3.1.0`.

```js
import { CHARACTERS, CLIPS_URL, LOCOMOTION } from './characters.js';
import { loadCharacter, loadClipData } from './character.js';

const clips = await loadClipData(CLIPS_URL);
const hero = await loadCharacter(CHARACTERS.female.url, clips);
scene.add(hero.root);
hero.play(LOCOMOTION.idle);
// render loop
hero.update(dt);            // mixer + vrm.update(dt): required every frame (MToon uniforms, spring bones)
hero.play(LOCOMOTION.walk, { fade: 0.25 });
```

- `humanoidClips.js` turns the baked, skeleton-independent clips into clips for the model's normalized humanoid bones
  and grounds the feet on the model's own proportions (per frame for grounded clips, constant offset for jumps).
- `characters.js` lists production files, credits, licence terms and restrictions (Cyber JT: no violent / sexual content).
