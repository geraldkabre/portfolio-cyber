# char-lab — character build and validation tools

No npm dependency: Node.js (static server + runner) and Microsoft Edge in headless mode (real GPU, WebGL2).
Three.js r169 and @pixiv/three-vrm 3.1.0 are loaded from jsDelivr with pinned versions.

```
node run.mjs <name> <model> [yaw] [map]
  <model>  path under assets-source/ | repo:<path under repo root> | lab:<path> | out:<path under LAB_OUT>
  env      LAB_OUT (results dir)  LAB_PAGE (default lab.html)  LAB_EXTRA (extra query, starts with &)  LAB_TIMEOUT (ms)
```
In Git Bash, export `MSYS_NO_PATHCONV=1` so that URL paths in `LAB_EXTRA` are not rewritten.

| Page | Purpose |
|---|---|
| `lab.html` | Static renders (front / side / back, face), stats, legacy per-frame UAL retarget, perf. Handles VRM, Rigify exports. |
| `anim-test.html` | **Production path**: loads a VRM through `src/cyberverse/characters/character.js`, plays the baked clips in real time with spring bones, measures shoe-to-ground contact (CPU skinning of the real shoe mesh), deformation close-ups, perf. |
| `lineup.html` | Both characters side by side (front, 3/4, back, faces, walk, jog). |
| `probe.html` | Diagnostic: material-ID render + ray picking (`update=0` reproduces the missing `vrm.update()` bug). |
| `studio/build.html?recipe=…` | Builds a production VRM from an original: `studio/recipes/cyber-jt.js`, `neon-fighter.js` (`inspect.js` = annotated UV maps). |
| `studio/bake-clips.html` | Bakes UAL clips into `ual-humanoid-clips.json`. |
| `blender_headshots.py` | Blender cross-check renders (Phase 2B). |

Studio modules: `studio/glb.js` (GLB/VRM read-write, sparse accessors, WebP images, mesh compaction, pruning),
`studio/bake.js` (UV-space baking from 3D position/normal, dilation, encoding), `studio/vrm.js` (MToon helpers),
`studio/ual-map.js` (UAL -> VRM humanoid names).

Rebuild everything (outputs go to `assets-source/_build/phase2c/`, then copied to `public/assets/`):
```
export MSYS_NO_PATHCONV=1 LAB_OUT=<repo>/assets-source/_build/phase2c
LAB_PAGE=studio/build.html LAB_EXTRA="&recipe=cyber-jt"     node run.mjs build_jt   04-characters-candidates/B-cyber-jt/3845387580598315530.vrm
LAB_PAGE=studio/build.html LAB_EXTRA="&recipe=neon-fighter" node run.mjs build_neon 04-characters-candidates/B-neon-fighter-plus/1302284466216378483.vrm
LAB_PAGE=studio/bake-clips.html LAB_EXTRA="&clips=Idle_Loop,Walk_Loop,...&fps=30" node run.mjs clips "03-universal-animation-library/.../UAL1_Standard.glb"
```
Originals are only read; every output is a new file.
