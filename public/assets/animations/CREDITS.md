# Animation credits

`ual-humanoid-clips.json` — 21 clips baked from **Universal Animation Library (Standard)** by **Quaternius**
(https://quaternius.com), licence **CC0 1.0** (public domain), file `UAL1_Standard.glb` (non root-motion).

Converted by `tools/char-lab/studio/bake-clips.html` into skeleton-independent humanoid clips (world rotation of each
VRM humanoid bone relative to the T-pose, 30 fps). Loaded at runtime by `src/cyberverse/characters/humanoidClips.js`,
which retargets them to any VRM and grounds the feet on the model's own leg proportions.

Included clips (no combat, weapon, injury or death clips — the Cyber JT licence forbids violent expression):
Idle_Loop, Idle_Talking_Loop, Walk_Loop, Walk_Formal_Loop, Jog_Fwd_Loop, Sprint_Loop, Jump_Start, Jump_Loop, Jump_Land,
Crouch_Idle_Loop, Crouch_Fwd_Loop, Interact, PickUp_Table, Push_Loop, Sitting_Enter, Sitting_Idle_Loop,
Sitting_Talking_Loop, Sitting_Exit, Roll, Dance_Loop, Fixing_Kneeling.
