# CYBERVERSE — Audit des assets (Phase 1)

Date de l'audit : 22/11/2026
Périmètre : `assets-source/` (3 packs Quaternius + `_excluded/`)
Méthode : inventaire des fichiers, comparaison avec les archives ZIP, analyse automatique du JSON de chaque `.gltf`/`.glb` (maillages, triangles, matériaux, textures, squelettes, animations, dimensions), lecture des licences et des images d'aperçu fournies par l'éditeur.

> **Limite importante.** Aucun modèle n'a été affiché dans un moteur 3D ou un viewer pendant cet audit. Les seules images regardées sont les aperçus (`Preview*.jpg/png`) fournis par Quaternius. Toute conclusion visuelle est donc **à confirmer** par un rendu réel (voir `NEXT_ACTIONS.md`).

Aucun fichier original n'a été modifié, déplacé ou supprimé.

---

## 1. Vue d'ensemble

| Pack | Dossier | Fichiers extraits | Intégrité vs ZIP | Licence |
|---|---|---|---|---|
| Cyberpunk Game Kit | `01-cyberpunk-game-kit/` | 358 | 358 / 358 ✔ | CC0 1.0 |
| Modular SciFi MegaKit **[Standard]** | `02-modular-sci-fi-megakit/` | 1 165 | 1 165 / 1 165 ✔ | CC0 1.0 |
| Universal Animation Library **[Standard]** | `03-universal-animation-library/` | 9 | 9 / 9 ✔ | CC0 1.0 |
| `_excluded/` | `_excluded/` | 0 (seulement `.gitkeep`) | — | — |

- Les trois ZIP d'origine sont toujours présents à côté des dossiers extraits (≈ 97 Mo au total). Ce sont des doublons ; ils peuvent rester localement, mais ne doivent pas être publiés.
- **Universal Base Characters : absent.** Aucun fichier de ce pack n'a été trouvé (recherche par nom de dossier et de fichier). Rien à exclure pour l'instant.
- Licence CC0 sur les trois packs : usage commercial et modification autorisés, attribution non obligatoire (mais recommandée : « Models by Quaternius »).
- Le MegaKit et l'Animation Library sont les versions **Standard (gratuites)**. Le fichier de licence du MegaKit précise qu'elle ne contient « qu'une partie des modèles » ; les aperçus `Preview_*.png` montrent probablement la version PRO/Source (shaders personnalisés). Il ne faut pas se baser sur ces images pour estimer ce qui est réellement disponible.

## 2. Formats disponibles

| Extension | Nombre | Commentaire |
|---|---|---|
| `.fbx` | 451 | Cyberpunk (71), MegaKit (2 × 189 : `FBX/` + `FBX (Unity)/`), UAL (2) |
| `.obj` + `.mtl` | 262 + 262 | Doublons statiques, sans squelette ni animation |
| `.gltf` | 261 | **Format retenu pour le web** |
| `.bin` | 190 | Données binaires des glTF du MegaKit |
| `.glb` | 2 | UAL (avec et sans root motion) |
| `.blend` | 71 | Sources Blender du Cyberpunk Kit |
| `.png` / `.jpg` | 28 / 1 | Textures + aperçus |
| `.zip` | 3 | Archives d'origine |
| `.txt` | 4 | Licences + README |

**Décision de format : glTF/GLB uniquement** pour l'application web. FBX, OBJ et `.blend` restent des sources locales.

## 3. Analyse technique des glTF (263 fichiers analysés, 0 erreur de lecture)

### 3.1 Cyberpunk Game Kit (71 glTF)
- Exporteur : Blender glTF I/O.
- **Buffers intégrés en base64** dans chaque `.gltf` → fichiers ~33 % plus lourds que nécessaire (19,7 Mo au total). À convertir en `.glb` lors de l'optimisation.
- **Matériaux en couleurs unies** (aucune texture de couleur), sauf la texture `Texture_Sign` (enseignes / écrans) — **dupliquée et intégrée dans 25 fichiers**. Style « flat / low-poly ».
- Extensions utilisées : `KHR_materials_specular`, `KHR_materials_ior` (supportées par Three.js).
- 1 personnage, 6 ennemis animés, 4 tourelles (statiques), 8 objets/pickups, 52 pièces d'environnement.

### 3.2 Modular SciFi MegaKit Standard (190 glTF)
- Fichiers `.gltf` + `.bin` séparés, très légers (0,8 Mo de glTF au total), textures PBR externes (BaseColor / Normal / ORM / Emissive, en PNG, jusqu'à 4 Mo chacune).
- ⚠ **Chemins de textures cassés :** 180 glTF référencent les textures par nom seul (`T_Trim_02_ORM.png`), alors qu'elles sont dans `../../Textures/`. Les 17 textures existent bien, mais un loader web ne les trouvera pas sans copie ou réécriture des chemins (à faire sur une **copie**, jamais sur l'original).
- ⚠ **`.bin` manquant :** `glTF/Decals/Decal_Line_90.gltf` référence `Decal_Line_90_001.bin`, alors que le fichier présent s'appelle `Decal_Line_90.bin`. Ce décal est inutilisable en l'état (sans impact sur la sélection recommandée).
- Grille modulaire : **4 m** (sols 4 × 4 m, murs 3 m de haut, colonnes 5 m, portes 4 m de haut).
- Catégories : Walls (84), Platforms (38, dont portes et escaliers), Props (28), Decals (29), Columns (8), Aliens (3).

### 3.3 Universal Animation Library Standard (2 GLB)
- `UAL1_Standard.glb` (sans root motion) et `UAL1_Standard_RM.glb` (root motion), 7,3 Mo chacun.
- Contiennent un **mannequin de démonstration** (orange/violet) + 65 os + **43 animations**.
- Détails dans `ANIMATION_AUDIT.md`.

## 4. Échelles mesurées (bind pose / boîtes englobantes)

| Élément | Hauteur mesurée |
|---|---|
| Personnage Cyberpunk (`Character`) | articulation de la tête à 1,19 m, maillage ≈ 1,40 m |
| Mannequin UAL | tête à 1,57 m, maillage ≈ 1,83 m |
| Porte MegaKit (`Door_Metal`) | 4,05 m × 2,1 m |
| Mur MegaKit (`WallAstra_Straight`) | 3,0 m |
| Plateforme Cyberpunk `Platform_4x4` | ≈ 3,9 m de côté |

→ Les packs **n'ont pas la même échelle**. Une normalisation (personnage ≈ 1,75–1,80 m) sera nécessaire à l'intégration.

## 5. Synthèse

| Besoin | Couvert par les packs ? |
|---|---|
| Environnement futuriste modulaire | ✔ Oui (MegaKit, + accessoires Cyberpunk) |
| Animations humanoïdes | ✔ Oui (UAL, 43 clips) |
| Ennemis / robots | ✔ Oui (Cyberpunk Kit) |
| **1 homme + 1 femme habillés, qualité premium** | ✘ **Non** — un seul humanoïde, non genré, style simple (voir `CHARACTER_AUDIT.md`) |

Documents liés : `CHARACTER_AUDIT.md`, `ENVIRONMENT_ASSET_SELECTION.md`, `ANIMATION_AUDIT.md`, `NEXT_ACTIONS.md`.
