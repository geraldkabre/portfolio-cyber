# CYBERVERSE — Validation réelle des personnages (Phases 2B et 2C)

Date : 22/11/2026

## Mise à jour Phase 2C (statut actuel)
- **Paire finale validée sur les copies de production :** Cyber JT (homme) et NEON FIGHTER + (femme), éditions CYBERVERSE, dans `public/assets/characters/`. Résultats complets, captures, mesures et limites dans **`CHARACTER_FINAL_DECISION.md`**.
- **Robert et Julieta** sont abandonnés.
- **Correction d'une erreur de la Phase 2B.** Le « rectangle sombre autour de la goutte » et le « petit élément flottant au-dessus de la tête » de NEON FIGHTER + (§7 et §8 ci-dessous) **n'étaient pas des défauts du modèle**. Mon outil de test n'appelait pas `vrm.update()`, si bien que three-vrm ne transmettait pas le seuil de transparence (`alphaTest`) au shader MToon. Avec cet appel, l'original s'affiche sans aucun de ces deux défauts. La preuve visuelle est dans `CHARACTER_FINAL_DECISION.md` §1.1. L'outil a été corrigé.
- Mesures Phase 2C sur les copies de production (Edge headless, Intel UHD, modules de l'application) :

| | Cyber JT CV | NEON FIGHTER + CV |
|---|---|---|
| Fichier | `public/assets/characters/cyber-jt/cyber-jt.cv.vrm`, 3,53 Mo | `public/assets/characters/neon-fighter/neon-fighter.cv.vrm`, 4,88 Mo |
| Triangles / os / expressions | 36 377 / 104 / 57 | 41 956 / 135 / 57 |
| Os humanoïdes pilotés (UAL) | 52 | 52 |
| Repos / marche / course | ✔ / ✔ / ✔ (pieds ancrés au sol) | ✔ / ✔ / ✔ |
| Temps par image (marche, 1280×720, ressorts actifs) | 0,93 ms | 1,74 ms |
| Défauts de transparence ou de maillage | aucun | aucun |

---

## Rapport d'origine de la Phase 2B (conservé tel quel, voir la correction ci-dessus)

Statut à l'époque : **validation effectuée sur les quatre fichiers réels.** Aucun personnage n'est approuvé définitivement. Recommandation au §8.

| Étape | Robert (A) | Julieta (A) | Cyber JT (B) | NEON FIGHTER + (B) |
|---|---|---|---|---|
| Fichier reçu et contrôlé (taille, SHA-256) | ✔ | ✔ | ✔ | ✔ |
| Licence vérifiée (API officielle + fichier) | ✔ | ✔ | ✔ | ✔ |
| Rendu réel face / profil / dos | ✔ | ✔ | ✔ | ✔ |
| Gros plan visage et cheveux | ✔ | ✔ | ✔ | ✔ |
| Squelette inspecté | ✔ Rigify, 703 os | ✘ **aucun squelette** | ✔ VRM, 104 os | ✔ VRM, 135 os |
| Repos / marche / course (UAL) | ✔ avec adaptation | ✘ impossible | ✔ | ✔ |
| Performance mesurée | ✔ | ✔ (statique) | ✔ | ✔ |
| Défauts visibles | Barbe (profil), visage moyen | **Visage : défauts de transparence** | Aucun | Rectangle sombre près de la goutte, petit élément flottant |
| **Verdict** | Non retenu | **Rejetée** | Technique ✔, style ✘ | **Retenue sous réserve** |

Les captures sont dans `assets-source/_research-previews/phase2b-validation/`, hors Git. Les originaux n'ont pas été modifiés : leurs empreintes SHA-256 sont identiques avant et après les tests.

---

## 1. Fichiers reçus

| Modèle | Fichier déposé | Taille | SHA-256 (début) | Contenu |
|---|---|---|---|---|
| Robert | `A-robert/robert_citizen_of_a_future_dystopia.zip` | 41,6 Mo (42,9 Mo extrait) | `dee6c683…` | `scene.gltf` + `scene.bin` + 25 textures PNG + `license.txt` |
| Julieta | `A-julieta/julieta_citizen_of_a_dystopic_future.zip` | 36,7 Mo (37,2 Mo extrait) | `a612968e…` | `scene.gltf` + `scene.bin` + 23 textures PNG + `license.txt` |
| Cyber JT | `B-cyber-jt/3845387580598315530.vrm` | 15,6 Mo | `7c53453a…` | VRM 0.0, VRoid Studio 1.7.0 |
| NEON FIGHTER + | `B-neon-fighter-plus/1302284466216378483.vrm` | 17,9 Mo | `1ed34484…` | VRM 0.0, VRoid Studio 1.20.2 |

- Seule l'archive **glTF** de Sketchfab a été déposée pour Robert et Julieta. L'« Original format », qui contient le squelette de Julieta, n'a pas été déposé.
- Les copies de travail extraites sont dans `assets-source/04-characters-candidates/_work/`. Les archives d'origine restent intactes.

## 2. Licences, vérifiées séparément pour chaque modèle

| Modèle | Licence | Usage commercial | Modification | Redistribution | Crédit | Restriction particulière |
|---|---|---|---|---|---|---|
| Robert | CC BY 4.0 | ✔ | ✔ | ✔ | **Obligatoire** | — |
| Julieta | CC BY 4.0 | ✔ | ✔ | ✔ | **Obligatoire** | — |
| Cyber JT | Licence VRoid Hub | ✔ (personnel lucratif et entreprise) | ✔ | ✔ | Non requis | **Violence interdite, contenu sexuel interdit** |
| NEON FIGHTER + | Licence VRoid Hub | ✔ (personnel lucratif et entreprise) | ✔ | ✔ | Non requis | Aucune (violence et contenu sexuel autorisés) |

- Pour Robert et Julieta, le `license.txt` contenu dans chaque archive confirme l'API Sketchfab.
- Pour les deux VRM, les métadonnées `vrm_meta` **inscrites dans le fichier** sont identiques à l'API VRoid Hub. Les deux modèles n'ont donc **pas** les mêmes droits.
- Le fichier de Cyber JT ne renseigne ni l'auteur ni le titre ; l'auteur public est Jonh Tinoco. NEON FIGHTER + indique l'auteur « Kanato ».

Crédits à afficher si Robert ou Julieta sont utilisés :
> *"Robert", citizen of a future dystopia* par Automatrio (https://sketchfab.com/automatrio), CC BY 4.0, https://sketchfab.com/3d-models/robert-citizen-of-a-future-dystopia-01966360b609405db6bde50fefd230cd

## 3. Méthode de test

- **Rendu Three.js r169 (WebGL)** : Microsoft Edge en mode headless sur le vrai GPU de la machine (Intel UHD Graphics, D3D11). Le moteur est le même que celui du futur site. Outil : `tools/char-lab/`.
- **VRM** : chargement natif avec `@pixiv/three-vrm` 3.1.0 (`VRMLoaderPlugin`). Contraintes de nœuds et ressorts (spring bones) actifs.
- **Animations** : `Idle_Loop`, `Walk_Loop` et `Jog_Fwd_Loop` de la UAL (`UAL1_Standard.glb`) sont retargetées os par os, par rotations en espace monde, avec translation des hanches mise à l'échelle. Chaque pose est rendue aussi sur le mannequin UAL, comme référence.
- **Contre-vérification dans Blender 5.3** (rendu EEVEE, import glTF, aucun fichier enregistré) : script `tools/char-lab/blender_headshots.py`. Elle a servi à confirmer que les défauts de Julieta viennent du modèle et non de Three.js.
- **Performance** : temps moyen sur 120 images animées en 1280×720. Ce temps inclut le calcul du retargeting fait à chaque image.

## 4. Les quatre aperçus réels

| Modèle | Vue face / profil / dos | Visage | Animations (repos, marche, course) |
|---|---|---|---|
| Robert | [robert_views.png](../../assets-source/_research-previews/phase2b-validation/robert_views.png) | [robert_face.png](../../assets-source/_research-previews/phase2b-validation/robert_face.png) | [robert_anim.png](../../assets-source/_research-previews/phase2b-validation/robert_anim.png) |
| Julieta | [julieta_views.png](../../assets-source/_research-previews/phase2b-validation/julieta_views.png) | [julieta_face.png](../../assets-source/_research-previews/phase2b-validation/julieta_face.png) · [Blender](../../assets-source/_research-previews/phase2b-validation/blender/julieta_head_front.png) | — (pas de squelette) |
| Cyber JT | [cyberjt_views.png](../../assets-source/_research-previews/phase2b-validation/cyberjt_views.png) | [cyberjt_face.png](../../assets-source/_research-previews/phase2b-validation/cyberjt_face.png) | [cyberjt_anim.png](../../assets-source/_research-previews/phase2b-validation/cyberjt_anim.png) |
| NEON FIGHTER + | [neon_views.png](../../assets-source/_research-previews/phase2b-validation/neon_views.png) | [neon_face.png](../../assets-source/_research-previews/phase2b-validation/neon_face.png) | [neon_anim.png](../../assets-source/_research-previews/phase2b-validation/neon_anim.png) |

Pour chaque modèle, le fichier `*_anim_ref.png` montre les mêmes poses sur le mannequin UAL.

## 5. Propriétés techniques mesurées (sur fichier, dans le navigateur)

| | Robert | Julieta | Cyber JT | NEON FIGHTER + |
|---|---|---|---|---|
| Triangles | 27 210 | 24 878 | 36 377 | 41 964 |
| Sommets | 18 580 | 15 749 | 108 921 | 144 425 |
| Matériaux | 10 (PBR) | 8 (PBR) | 16 (MToon) | 18 (MToon) |
| Textures | 25 (17 en 2048², PNG) | 23 (9 en 2048²) | 28 | 32 |
| Mémoire GPU des textures (estimation) | **≈ 383 Mo** | ≈ 246 Mo | ≈ 115 Mo | ≈ 151 Mo |
| Os | **703** (Rigify complet : DEF + ORG + MCH) | 0 | 104 | 135 |
| Expressions (morph targets) | 0 | 0 | 57 | 57 |
| Animations incluses dans le fichier | 0 | 0 | 0 | 0 |
| Échelle d'export | ×100 environ (cm), pose jouée | ×100 environ | 1 m = 1 unité | 1 m = 1 unité |
| Hauteur affichée | 1,78 m (normalisée) | 1,75 m (normalisée) | 1,78 m | ≈ 1,85 m (oreilles comprises) ; 2,12 m avec l’élément flottant |
| Draw calls par image | 14 | 12 | 22 | 28 |
| Triangles rendus par image | 40 854 | 40 362 | 53 615 (contours MToon) | 78 506 (contours MToon) |
| Temps moyen par image (Intel UHD) | 3,6 ms | 0,8 ms (statique) | 6,8 ms | 8,3 ms |
| Chargement local | 0,44 s | 0,36 s | 0,53 s | 0,51 s |

Les quatre modèles tiennent largement dans le budget de 16,7 ms par image (60 i/s), même sur ce GPU intégré. Cela ne garantit pas les performances sur mobile ou sur d'autres appareils.

## 6. Squelettes et animations

| Modèle | Résultat UAL | Détail |
|---|---|---|
| **Robert** | ✔ **après adaptation de l'outil** | Rigify a été exporté avec tout le rig de contrôle. Les os du visage dépendent de `ORG-face`, pas de l'os de tête. La scène Sketchfab est en plus enregistrée dans une pose jouée (bras levé), avec la vraie pose de repos couchée (repère Z vers le haut de Blender). Le retargeting simple déformait la tête. J'ai ajouté un mode « espace monde » : retour à la vraie pose de repos calculée depuis les matrices de liaison, et chaque os non piloté suit son os parent logique. Avec ce mode, repos, marche et course sont corrects. **Limite :** pour la production, il faudra un squelette propre (os DEF seulement) ou des clips précalculés, sinon on garde ce calcul de 706 os à chaque image. |
| **Julieta** | ✘ | Le glTF Sketchfab ne contient **aucun squelette** (9 maillages statiques). Le rig n'existe que dans l'« Original format », non déposé. |
| **Cyber JT** | ✔ | Humanoïde VRM complet (54 os humanoïdes), 52 os pilotés, aucun os essentiel manquant. Repos, marche et course corrects, pieds au sol, manches et capuche suivent. |
| **NEON FIGHTER +** | ✔ | Même résultat que Cyber JT. Cheveux, oreilles et accessoires suivent la tête. |

Comme prévu en Phase 1, la UAL n'a ni virages ni pas latéraux : c'est vrai pour les quatre modèles.

## 7. Qualité visuelle et défauts relevés

**Robert**
- ✔ Veste noire à liserés cyan lumineux, pantalon et bottes assortis : c'est le plus proche de la palette cyan demandée.
- ✘ T-shirt vert olive, hors palette.
- ✘ Style **réaliste PBR**, pas « jeu vidéo stylisé légèrement cartoon ». Visage peu flatteur (yeux écarquillés, teint irrégulier), cheveux peints en mèches épaisses.
- ✘ De profil, une bande sombre apparaît sur la joue au niveau de la barbe, au repos comme en mouvement. La contre-vérification Blender n'a pas pu être faite pour Robert : l'importeur Blender 5.3 produit un modèle mal dimensionné à partir de ce rig.
- ✘ Poids : 383 Mo de textures en mémoire GPU, 703 os.

**Julieta : rejetée**
- ✘ Pas de squelette, donc aucune animation possible avec le fichier déposé.
- ✘ **Défauts de transparence sur le visage** : taches sombres autour de la bouche et sur les joues. Ils sont visibles dans Three.js **et** dans Blender, donc ils viennent du modèle.
- ✘ Ventre découvert et sandales ouvertes : ne respecte pas « entièrement habillé, chaussures complètes ». Le critère « aucun trou ni défaut de transparence » n'est pas respecté non plus.

**Cyber JT**
- ✔ Rendu propre, aucun trou ni problème de transparence ou de chevauchement visible. Cheveux et visage de bonne qualité (style anime VRoid). Proportions correctes, 1,78 m.
- ✘ **Tenue décontractée** : sweat à capuche noir, jean, baskets, lunettes, logo vert. Pas de techwear futuriste, ni cyan ni violet. **Ne correspond pas au style demandé.**
- ⚠ Licence : violence interdite.

**NEON FIGHTER +**
- ✔ Palette cyan et bleu électrique très marquée. Entièrement habillée : veste zippée, short, collants, baskets. Cheveux longs dégradés cyan, oreilles et halo néon. Visage anime de bonne qualité.
- ⚠ Le motif en trame (halftone) des cheveux et de la veste peut scintiller à distance (moiré).
- ⚠ **Deux défauts dans Three.js, absents de la vignette officielle VRoid Hub** :
  1. un rectangle sombre autour de la goutte suspendue ;
  2. un petit trait sombre qui flotte à environ 2,12 m, au bout de la même mèche (matériau `Hair_00_HAIR_03`).
- Pour ces deux défauts, j'ai écarté plusieurs causes : la texture (alpha correcte, 0 autour de la goutte), les contours MToon, la physique des cheveux et les mipmaps. **La cause n'est pas encore identifiée.**

Style commun : Cyber JT et NEON FIGHTER + ont le même rendu anime (MToon). Robert est réaliste. **Associer Robert à NEON FIGHTER + donnerait un ensemble visuellement incohérent.**

## 8. Recommandation

**Aucune paire ne remplit tous les critères.** Je ne déclare donc aucun personnage approuvé.

| Rôle | Recommandation | Justification |
|---|---|---|
| **Femme** | **NEON FIGHTER +, retenue sous réserve** | Seul modèle validé à la fois techniquement (VRM natif, UAL ✔, 8,3 ms) et dans la palette. Réserve : corriger ou expliquer le rectangle et l'élément flottant de la mèche-goutte avant l'approbation définitive. |
| **Homme** | **Aucun candidat retenu** | Cyber JT est techniquement parfait et cohérent avec NEON, mais sa tenue ne correspond pas au cahier des charges. Robert a la bonne palette, mais pas le bon style, sa qualité est moyenne, il pose des problèmes techniques et il ne s'accorde pas avec NEON. |

Suite proposée :
1. **Garder NEON FIGHTER +** et chercher un **homme VRoid** en techwear marine, cyan et violet, avec une licence permissive vérifiée. On garde ainsi le même format, le même chargeur, le même retargeting et le même style. C'est l'option recommandée.
2. Ou **accepter Cyber JT tel quel**, en sachant que sa tenue est décontractée.
3. Ou, **seulement avec votre autorisation explicite**, recolorer les textures de Cyber JT (sweat marine, accents cyan et violet). Sa licence le permet, mais c'est une modification d'apparence, que vos règles interdisent jusqu'ici.

## 9. Limites de cette validation
- La performance a été mesurée sur une seule machine (GPU intégré Intel, navigateur Edge headless).
- Le retargeting UAL est fait dans l'outil de test, par calcul à chaque image. En production, il faudra un retargeting VRM standard ou des clips précalculés.
- Les défauts de NEON FIGHTER + n'ont pas été comparés dans un autre lecteur VRM : il n'y a pas d'add-on VRM dans Blender et je n'ai rien installé. La comparaison s'appuie sur la vignette officielle VRoid Hub.
- La contre-vérification Blender de Robert n'a pas pu être faite (import du rig Rigify incorrect dans Blender 5.3).
