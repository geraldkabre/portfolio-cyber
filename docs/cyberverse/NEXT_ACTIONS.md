# CYBERVERSE — Prochaines actions

Date : 22/11/2026 · Suite de la Phase 1 (audit)

## Constat principal

| Domaine | Statut |
|---|---|
| Environnement (MegaKit + accessoires Cyberpunk) | ✔ Suffisant pour un premier lieu |
| Animations (UAL, 43 clips) | ✔ Suffisant pour idle / marche / course / saut / interactions ; ✘ pas de virages ni de déplacements latéraux |
| **Personnages homme + femme habillés** | ✘ **Bloquant** — aucun candidat valable dans les packs |
| Vérification visuelle | ✘ Non effectuée (aucun modèle affiché dans un viewer) |

## Actions, dans l'ordre

### 1. 🔴 Trouver les deux personnages (bloquant)
Suivre le plan de `CHARACTER_AUDIT.md` §3 :
- Créer `assets-source/04-characters-candidates/` (déjà ignoré par Git via `/assets-source/`).
- Consulter en premier les packs gratuits de **quaternius.com** (même auteur que la UAL → meilleure chance de squelette compatible), puis Mixamo, Sketchfab (CC0/CC-BY), VRoid Hub.
- Pour chaque candidat : licence archivée, analyse automatique, vérification visuelle, test UAL `Idle_Loop` + `Walk_Loop`.
- Décision finale : un seul couple homme/femme cohérent.

### 2. 🟠 Vérification visuelle des assets d'environnement
- Ouvrir les 16 pièces de `ENVIRONMENT_ASSET_SELECTION.md` dans un viewer glTF (par ex. glTF Viewer de Don McCurdy, dans le navigateur, sans installation), avec une **copie** dont les textures ont été placées à côté des `.gltf`.
- Capturer des images et confirmer : matériaux, alignement sur la grille de 4 m, compatibilité de style MegaKit / Cyberpunk.

### 3. 🟡 Pipeline de copie et d'optimisation (après validation)
- Copier (jamais déplacer) les pièces validées vers un dossier de travail.
- Convertir en GLB, regrouper ou corriger les chemins de textures, redimensionner/compresser les textures, compresser la géométrie.
- Extraire de la UAL uniquement les clips retenus.
- Écrire le résultat dans `public/assets/…`.
- Nécessite un outil comme `@gltf-transform/cli` → **installation de dépendance à valider avec vous avant**.

### 4. 🟢 Scène de test minimale
Un couloir + une porte animée par code + un personnage qui joue `Idle_Loop` / `Walk_Loop`. Pas de ville à ce stade.

## Corrections à faire plus tard (sur copies uniquement)
- `Decal_Line_90.gltf` : référence `Decal_Line_90_001.bin` inexistant.
- 180 glTF du MegaKit : chemins de textures relatifs incorrects.
- Cyberpunk Kit : `Texture_Sign` dupliquée dans 25 fichiers → à mutualiser lors de la conversion.

## Mise à jour du 22/11/2026 — Phase 2 (personnages)
Voir `CHARACTER_CANDIDATES.md` (version Phase 2).
- Quaternius Ultimate Modular Men/Women : **rétrogradés** (low-poly, assemblage en 4 parties). Non approuvés.
- Aucun outil de génération 3D disponible dans l'environnement ; les offres gratuites (Meshy, Tripo, Hunyuan3D) ne permettent pas d'obtenir des personnages texturés, riggés et utilisables commercialement.
- Paires à tester : **A** (Robert + Julieta, Sketchfab, CC BY) et **B** (NEON FIGHTER + / Cyber JT, VRoid, VRM). Repli : **C** (asset_for_games).
- **Prochaine étape :** vous téléchargez (comptes Sketchfab / pixiv gratuits requis) la ou les paires choisies dans `assets-source/04-characters-candidates/`. Ensuite : analyse, rendu réel, test d'animation. L'écran de sélection n'est pas construit avant validation.

## Mise à jour du 22/11/2026 — Phase 2B (validation réelle)
Voir `CHARACTER_VALIDATION.md`. Fichiers reçus, quatre modèles rendus et testés (UAL idle / marche / course), licences revérifiées dans les fichiers, originaux intacts (SHA-256).
- **Julieta : rejetée** (pas de squelette, défauts de transparence au visage confirmés dans Three.js et Blender, tenue non conforme).
- **Robert : non retenu** (style réaliste, qualité du visage moyenne, rig Rigify de 703 os difficile à exploiter, 383 Mo de textures).
- **Cyber JT** : techniquement parfait, mais tenue décontractée hors cahier des charges.
- **NEON FIGHTER + : retenue sous réserve** (rectangle sombre près de la goutte et petit élément flottant dans Three.js, cause non identifiée).
- **Décision attendue** : chercher un homme VRoid en techwear (recommandé), accepter Cyber JT, ou autoriser explicitement une recoloration de ses textures.

## Mise à jour du 22/11/2026 — Phase 2C (personnages terminés)
Voir **`CHARACTER_FINAL_DECISION.md`**.
- ✔ **Personnages finaux validés sur les copies de production :**
  - `public/assets/characters/cyber-jt/cyber-jt.cv.vrm` (homme, refonte techwear) ;
  - `public/assets/characters/neon-fighter/neon-fighter.cv.vrm` (femme, finition).
- ✔ **Animations :** 21 clips UAL humanoïdes (`public/assets/animations/ual-humanoid-clips.json`) avec ancrage des pieds au sol.
- ✔ **Code d'exécution prêt :** `src/cyberverse/characters/`, qui contient `loadCharacter`, `buildHumanoidClips` et le manifeste `characters.js` (crédits et restrictions).
- ✔ **Correction :** les « défauts » de NEON FIGHTER + signalés en Phase 2B venaient de l'outil de test (`vrm.update()` absent), pas du modèle.
- Rien n'est commité ni poussé.

## ➡ Prochaines opérations recommandées (passage au monde)
1. **Créer l'application** : projet Vite + `three@0.169.0` + `@pixiv/three-vrm@3.1.0`, à installer avec votre accord. Brancher `src/cyberverse/characters/` et servir `public/`.
2. **Contrôleur de personnage** : déplacement au clavier, caméra à la troisième personne, machine d'états Idle → Walk → Jog → Sprint avec fondus enchaînés (`play(name, { fade })`), rotation du personnage par code (la UAL n'a pas de virages), saut Jump_Start → Jump_Loop → Jump_Land.
3. **Rendu néon** : bloom sélectif (`UnrealBloomPass` ou équivalent) pour faire briller les cartes d'émission cyan et violettes des deux personnages et du décor.
4. **Premier lieu (MegaKit et Cyberpunk Kit)** : vérifier visuellement les 16 pièces de `ENVIRONMENT_ASSET_SELECTION.md`, puis assembler une rue courte avec une porte animée, avant toute ville complète.
5. **Pipeline d'assets d'environnement** : conversion GLB, chemins de textures corrigés, textures en WebP. Les outils `tools/char-lab/studio` (`glb.js`, `bake.js`) peuvent être réutilisés sans dépendance.
6. **Écran de sélection homme / femme** : maintenant possible, puisque les deux personnages sont validés.

## ➡ Opération suivante exacte recommandée (version initiale, désormais réalisée)

**Rechercher et évaluer des personnages gratuits homme/femme déjà habillés, en commençant par le catalogue gratuit de quaternius.com**, selon la grille de `CHARACTER_AUDIT.md` §3.1, et produire `docs/cyberverse/CHARACTER_CANDIDATES.md` (URL, licence, contenu réel vérifié, compatibilité squelette attendue) **avant tout téléchargement**. Rien ne sera téléchargé ou installé sans votre accord.

## Mise à jour du 22/11/2026 — Jalon 3 (premier monde jouable) ✔
Voir **`MILESTONE_3_REPORT.md`** (résultats, captures, mesures) et **`ARCHITECTURE.md`** (choix techniques).
- ✔ Application Vite + TypeScript + React (interface) + moteur Three.js r169 impératif, version de production testée.
- ✔ Île Nexus Prime : Command Center (rotonde, flèche, hall des opérations), avenue, portail Est, avant-poste de l'Académie, horizon des six districts.
- ✔ Les deux personnages validés, sélection, caméra troisième personne, ZQSD/WASD, souris, repos / marche / course / sprint / saut, collisions.
- ✔ 25 + 25 + 14 vérifications automatisées réussies (Edge, vrai GPU, vraies entrées). Performances mesurées (§4 du rapport).
- ⚠ À confirmer par vous : intitulé exact de la formation (brief : « Dadoh University » ; README : « UMET Burkina, ISTI »).

## ➡ Jalon 4 — Introduction cinématique et sélection (proposition)
1. **Séquence de démarrage « connexion sécurisée »** : écran de chargement narratif (journal d'authentification animé, progression réelle des assets), puis ouverture sur le monde.
2. **Survol cinématique de l'île** (GSAP pour la chorégraphie caméra : arrivée par le ciel, passage autour de la flèche, descente vers le point d'arrivée), interruptible, raccourci si « mouvements réduits ».
3. **Sélection plus vivante** : idle atmosphériques différenciés, rotation légère des opérateurs à la souris, retour visuel de sélection (anneau, faisceau, son au jalon 7), présentation des deux opérateurs.
4. **Transition sélection → jeu** retravaillée (dématérialisation en particules au lieu de la compression actuelle).
5. Vérification manuelle du verrouillage du pointeur dans une vraie fenêtre (non testable en mode sans affichage).

## Reporté aux jalons suivants (rappel)
- Jalon 5 : remplacer les six silhouettes par les vrais districts ; contenu par district.
- Jalon 6 : mode recruteur `/recruiter` (sans moteur 3D), photo professionnelle à fournir, CV téléchargeable.
- Jalon 7 : musique d'ambiance originale ou sous licence vérifiée, effets sonores, réglages audio.
- Jalon 8 : commandes tactiles, textures KTX2 (personnages ≈ 140 Mo GPU chacun), fallback WebGL complet, déploiement Netlify (avec votre accord).
