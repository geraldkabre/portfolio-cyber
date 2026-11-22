# CYBERVERSE — Audit des personnages

Date : 22/11/2026

Objectif du portfolio : **exactement deux personnages humanoïdes entièrement habillés — un homme, une femme**, style cyberpunk stylisé premium (techwear), qualité jeu, sans modélisation, sans création de vêtements, sans modification des maillages.

> Aucun personnage n'a été affiché dans un viewer 3D pendant cet audit. Les observations visuelles proviennent uniquement de l'image d'aperçu fournie par l'éditeur (`Preview.jpg`) et des noms/couleurs de matériaux lus dans les fichiers.

---

## 1. Inventaire de tous les modèles avec squelette

| Fichier | Pack | Type | Os | Animations | Humanoïde ? |
|---|---|---|---|---|---|
| `Character/Character.gltf` | Cyberpunk | Personnage jouable | 25 | 22 | **Oui (le seul)** |
| `Enemies/Enemy_2Legs(_Gun)` | Cyberpunk | Robot à 2 pattes | 15 | 7 | Non |
| `Enemies/Enemy_Flying(_Gun)` | Cyberpunk | Drone volant | 11–12 | 6 | Non |
| `Enemies/Enemy_Large(_Gun)` | Cyberpunk | Gros robot | 15 | 8 | Non |
| `Aliens/Alien_Cyclop` | MegaKit | Créature | 8 | 1 (`Alien_Idle`) | Non |
| `Aliens/Alien_Oculichrysalis` | MegaKit | Créature | 9 | 1 | Non |
| `Aliens/Alien_Scolitex` | MegaKit | Créature à pinces | 33 | 1 | Non |
| `UAL1_Standard(_RM).glb` → `Mannequin` | UAL | Mannequin de démonstration | 65 | 43 | Humanoïde, mais **pas un personnage** (corps neutre sans vêtements, matériaux orange/violet de test) |

Les tourelles (`Turret_*`) n'ont ni squelette ni animation.

## 2. Analyse du seul candidat : `Character.gltf` (Cyberpunk Game Kit)

| Critère | Constat | Vérifié par |
|---|---|---|
| Format | glTF intégré (1,43 Mo), FBX, OBJ, `.blend` | Fichiers |
| Géométrie | 7 520 triangles, 4 maillages | Analyse JSON |
| Matériaux | 7 couleurs unies : `Main` (gris), `Accent` (orange), `Accent_Dark`, `Black`, `Blade`, `Blade_Edge`, `Material` (blanc) — **aucune texture** | Analyse JSON |
| Arme | Os `Weapon` + matériaux `Blade` → **épée intégrée au maillage** | Analyse JSON |
| Squelette | 25 os, sans doigts, pieds avec cibles IK (`PT.L`, `PT.R`) | Analyse JSON |
| Proportions | tête à 1,19 m, bassin à 0,65 m → proportions compactes | Bind pose |
| Pose de repos | T-pose | Bind pose |
| Animations | 22 clips (Idle, Walk, Run + directions, Roll, attaques, Interact, Wave, Death…) | Analyse JSON |
| Apparence | Sur l'aperçu éditeur : petite silhouette robotique/androïde, casque blanc, torse jaune-orange, épée — **pas d'identité masculine ou féminine identifiable** | `Preview.jpg` seulement |

### Verdict
- ✔ Habillé / non nu (silhouette androïde à couleurs unies).
- ✘ **Ni clairement masculin, ni clairement féminin.**
- ✘ **Pas de niveau « premium techwear »** : style low-poly à couleurs unies, sans textures.
- ✘ Il n'existe **qu'un seul** humanoïde dans les trois packs.
- ⚠ Épée fusionnée au maillage : la retirer impliquerait de modifier le maillage, ce qui est interdit.

**Conclusion : les packs actuels ne permettent PAS de fournir les deux personnages requis.** `Character.gltf` peut au mieux servir de PNJ/robot d'ambiance ou de doublure technique (test de retargeting, placeholder), pas de personnage principal.

Le mannequin UAL n'est pas éligible : c'est un corps de référence sans vêtements, ce qui va à l'encontre de la consigne d'exclusion des maillages de base nus.

## 3. Plan de recherche pour deux personnages prêts à l'emploi

### 3.1 Critères d'acceptation (tous obligatoires)
1. Entièrement habillé dès la livraison, aucune pièce de vêtement à créer ou à ajouter.
2. Un homme et une femme clairement identifiables, de style cohérent entre eux (idéalement le même auteur/pack).
3. Style cyberpunk / techwear / futuriste, finition « jeu » (textures ou matériaux soignés).
4. **Gratuit**, avec une licence claire autorisant l'usage dans un portfolio web public (CC0, CC-BY ou licence équivalente ; licence vérifiée et archivée).
5. Format glTF/GLB ou FBX convertible.
6. Squelette humanoïde, idéalement compatible avec un squelette type Unreal/Mannequin (`pelvis`, `spine_01…`, `upperarm_l`…) ou Mixamo, pour réutiliser la Universal Animation Library.
7. Budget web : idéalement < 30 000 triangles et < 10 Mo par personnage après optimisation.
8. Pas de nudité, ni de maillage de base à habiller.

### 3.2 Sources à examiner (contenus **non vérifiés** — à contrôler un par un)
Ces pistes sont des endroits à consulter, pas des assets dont l'existence ou l'adéquation est confirmée :

| Priorité | Source | Pourquoi | Point de vigilance |
|---|---|---|---|
| 1 | **quaternius.com** (autres packs gratuits de personnages) | Même auteur → style, échelle et conventions de squelette potentiellement cohérents avec la UAL | Vérifier qu'un pack contient des personnages *déjà habillés* et non des bases nues (Universal Base Characters exclus) |
| 2 | **Mixamo** (Adobe, compte gratuit) | Personnages habillés et riggés, export FBX | Licence Adobe propre (pas CC0) : vérifier les conditions d'usage web ; style souvent réaliste plutôt que stylisé |
| 3 | **Sketchfab** (filtre « Downloadable », licence CC0/CC-BY, recherche « cyberpunk character rigged ») | Large choix de personnages stylisés | Qualité et rig très variables ; vérifier licence, nombre de triangles, présence d'un squelette |
| 4 | **Kenney.nl** (personnages animés CC0) | CC0, léger, pensé pour le jeu | Style très simple, probablement loin de « premium techwear » |
| 5 | **OpenGameArt.org / itch.io** (filtre gratuit) | Packs indépendants | Licences hétérogènes, à lire attentivement |
| 6 | **VRoid Hub** (modèles téléchargeables autorisés) | Personnages stylisés habillés, format VRM (glTF) | Conditions définies par chaque auteur ; style anime ; squelette VRM à mapper |

### 3.3 Procédure d'évaluation pour chaque candidat
1. Relever : URL, auteur, licence exacte (capture + copie du texte), date.
2. Télécharger dans `assets-source/04-characters-candidates/<nom>/` (dossier ignoré par Git), sans modifier l'original.
3. Lancer la même analyse automatique que cet audit (triangles, matériaux, textures, squelette, animations).
4. Afficher le modèle dans un viewer glTF (vérification visuelle réelle, avec capture d'écran).
5. Tester l'application d'au moins `Idle_Loop` et `Walk_Loop` de la UAL (voir `ANIMATION_AUDIT.md`).
6. Noter dans une grille : style, cohérence homme/femme, qualité, poids, compatibilité animation, licence.
7. Retenir **un seul couple** homme/femme.

Aucun téléchargement ni achat n'a été effectué pendant cet audit.
