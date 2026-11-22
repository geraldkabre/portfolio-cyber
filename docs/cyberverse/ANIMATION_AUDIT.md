# CYBERVERSE — Audit des animations

Date : 22/11/2026

Sources analysées :
- `03-universal-animation-library/.../Unreal-Godot/UAL1_Standard.glb` (sans root motion)
- `03-universal-animation-library/.../Unreal-Godot/UAL1_Standard_RM.glb` (root motion intégré, d'après le README)
- `01-cyberpunk-game-kit/.../Character/Character.gltf` (animations propres au personnage)

> Les tests ci-dessous sont des **tests structurels** (lecture des squelettes, des matrices de bind pose et des pistes d'animation). **Aucune animation n'a été jouée ni regardée dans un moteur 3D.** La compatibilité visuelle reste à confirmer.

---

## 1. Universal Animation Library (UAL) — 43 clips

Squelette : `Armature`, 65 os, nomenclature type Unreal Mannequin (`root`, `pelvis`, `spine_01…03`, `neck_01`, `Head`, `clavicle_l`, `upperarm_l`, `lowerarm_l`, `hand_l` + 5 doigts × 4 phalanges par main, `thigh_l`, `calf_l`, `foot_l`, `ball_l`…). Pose de repos : T-pose. Les clips animent translation, rotation **et** échelle sur tous les os.

### 1.1 Classement par besoin

| Besoin | Clips disponibles (durée) |
|---|---|
| **Idle** | `Idle_Loop` (2,5 s), `Idle_Talking_Loop` (2,9 s), `Idle_Torch_Loop` (1,3 s), `Crouch_Idle_Loop` (2,9 s), `Pistol_Idle_Loop`, `Sword_Idle`, `Sitting_Idle_Loop`, `Swim_Idle_Loop` |
| **Marche** | `Walk_Loop` (1,3 s), `Walk_Formal_Loop` (1,3 s), `Crouch_Fwd_Loop` (2,0 s) |
| **Course** | `Jog_Fwd_Loop` (0,93 s), `Sprint_Loop` (0,67 s) |
| **Saut** | `Jump_Start` (1,3 s) → `Jump_Loop` (2,5 s) → `Jump_Land` (1,3 s) |
| **Virages / déplacements latéraux** | ✘ **Aucun** clip de rotation sur place, de pas latéral ou de marche arrière dans la version Standard |
| **Interactions utiles** | `Interact` (2,0 s), `PickUp_Table`, `Push_Loop`, `Fixing_Kneeling` (5,2 s), `Sitting_Enter / Exit / Talking_Loop`, `Idle_Talking_Loop`, `Driving_Loop`, `Dance_Loop` |
| Autres | `Roll`, `Hit_Chest`, `Hit_Head`, `Death01`, `Punch_Jab`, `Punch_Cross`, `Sword_Attack`, `Pistol_*` (Aim, Reload, Shoot), `Spell_Simple_*`, `Swim_Fwd_Loop`, `A_TPose` |

Recommandation pour le portfolio (non-combat) : `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Jump_Start/Loop/Land`, `Interact`, `Idle_Talking_Loop`, `Sitting_*`. Les virages se feront par rotation du personnage en code (pas de clip dédié).

### 1.2 Root motion ou non ?
Le README indique que `_RM` contient le déplacement de la racine. Pour un contrôleur web (Three.js / R3F) où le code déplace le personnage, **`UAL1_Standard.glb` (sans root motion)** est le plus simple. Les deux fichiers contiennent le même mannequin et les mêmes 43 clips.

## 2. Animations propres au personnage Cyberpunk (22 clips)

Squelette `CharacterArmature`, 25 os. Clips : `Idle_Neutral`, `Idle_Sword`, `Idle_Gun_Pointing`, `Idle_Gun_Shoot`, `Walk`, `Run`, `Run_Back`, `Run_Left`, `Run_Right`, `Run_Shoot`, `Roll`, `Interact`, `Wave`, `Punch_Left/Right`, `Kick_Left/Right`, `Sword_Slash`, `Gun_Shoot`, `HitRecieve(_2)`, `Death`.
→ Ce personnage possède les **déplacements directionnels** absents de la UAL, mais seulement pour son propre squelette.

## 3. Test de compatibilité du retargeting

### 3.1 UAL → `Character.gltf` (Cyberpunk) — test effectué

Correspondance testée sur 20 os (`Hips→pelvis`, `Abdomen→spine_01`, `Torso→spine_02`, `Chest→spine_03`, `Neck→neck_01`, `Shoulder.L→clavicle_l`, `UpperArm.L→upperarm_l`, `UpperLeg.L→thigh_l`, `LowerLeg.L→calf_l`, `Foot.L→foot_l`, etc.).

| Vérification | Résultat |
|---|---|
| Noms des os | ✘ Différents → table de correspondance obligatoire |
| Pose de repos | ✔ T-pose des deux côtés |
| Hiérarchie colonne / bras / jambes | ✔ 18 os sur 20 ont un parent équivalent |
| **Hiérarchie des pieds** | ✘ `Foot.L/R` est enfant de `Root` (rig IK avec cibles `PT.L/R`), alors que `foot_l/r` est enfant du mollet dans la UAL. Les rotations UAL appliquées aux jambes **ne déplaceront pas les pieds** → déformation probable des chevilles |
| Orientation des os (axe local) | ✔ Bras : < 1° d'écart · ✔ Jambes : 5–8° · ⚠ Bassin/colonne : 10–22° · ✘ Clavicules : 42° · ✘ Pieds : 31° |
| Proportions (normalisées) | ⚠ Avant-bras plus long (0,52 vs 0,42), clavicule beaucoup plus courte (0,09 vs 0,34), personnage plus petit (1,19 m vs 1,57 m pour l'articulation de la tête) |
| Doigts | Personnage sans doigts → pistes de doigts UAL ignorées (sans gravité) |
| Pistes de translation/échelle | ⚠ La UAL anime translation et échelle sur tous les os : il faudra ne garder que les rotations (+ translation du bassin mise à l'échelle) |

**Verdict : retargeting UAL → Character possible seulement partiellement.** Le haut du corps est probablement exploitable après correction des clavicules et du bassin ; **les pieds ne suivront pas sans modification du rig ou un solveur IK**. De toute façon, ce personnage n'est pas retenu (voir `CHARACTER_AUDIT.md`) et il possède déjà ses propres animations de base.

### 3.2 UAL → personnages homme/femme définitifs — **non testable aujourd'hui**
Aucun personnage définitif n'est disponible. Le test sera refait sur chaque candidat avec les mêmes contrôles : noms d'os, hiérarchie, pose de repos, orientation des axes, proportions, puis **lecture réelle** de `Idle_Loop`, `Walk_Loop` et `Jog_Fwd_Loop` dans un viewer.

Le cas le plus favorable serait un personnage à squelette type Unreal Mannequin ou un personnage Quaternius récent partageant le squelette UAL ; un rig Mixamo demandera une table de correspondance supplémentaire (`mixamorig:Hips` → `pelvis`, etc.).

## 4. Poids
7,3 Mo par GLB, dont l'essentiel en données d'animation pour 65 os × 3 pistes. En ne gardant que la dizaine de clips utiles, uniquement les rotations, et en appliquant une compression des clés, le poids devrait fortement baisser (gain exact à mesurer).
