# CYBERVERSE — Architecture technique

Date : 22/11/2026 · État : jalon 3 (premier monde jouable)

## 1. Choix de la pile

| Besoin | Choix | Raison |
|---|---|---|
| Outil de build | **Vite 8**, projet unique à la racine | Démarrage instantané, découpage du code, construction multi-pages prête pour `/recruiter`. Next.js est inutile : le site est statique, sans rendu serveur. |
| Langage | **TypeScript 7** (strict) | Contrats explicites entre le moteur, le monde et l'interface. Les modules VRM validés en Phase 2C restent en JS et sont typés par des `.d.ts`, pour ne pas réécrire un code déjà validé. |
| Interface | **React 19**, interface uniquement (DOM) | Chargement, sélection, HUD, panneaux, et plus tard le mode recruteur et les transitions avec Motion. |
| Rendu 3D | **Three.js r169**, moteur **impératif** (pas de React Three Fiber) | La boucle de jeu (contrôleur, caméra, physique, post-traitement) est par nature impérative. Un seul système de rendu, maîtrise totale de l'ordre des mises à jour, débogage simple. r169 est la version validée avec les personnages. |
| Personnages | **@pixiv/three-vrm 3.1.0** | Paire validée en Phase 2C (VRM 0.x, MToon, cheveux dynamiques). |
| Post-traitement | **postprocessing 6.39.6** | Effets fusionnés en une seule passe : bloom par mipmaps, tone mapping AgX, vignette. Moins coûteux que l'`EffectComposer` des exemples Three.js. |
| Collisions | **three-mesh-bvh 0.9.18** | Capsule du personnage contre la géométrie statique, sonde de sol, collision de la caméra. Une physique complète (Rapier, WebAssembly) serait superflue : rien de dynamique. |
| Pipeline d'assets | **gltf-transform 4.5**, **sharp 0.35**, meshoptimizer (dépendances de développement) | Conversion reproductible des packs Quaternius : sélection des pièces, fusion, nettoyage, textures WebP 2K et 1K. |
| Tests | **playwright-core 1.65** (dépendance de développement) | Pilote le **Microsoft Edge déjà installé**, sans téléchargement de navigateur, avec de vraies touches, une vraie souris et de vraies captures. |

Écartés pour l'instant :
- GSAP et Motion : jalons 4 et 7 (cinématiques, transitions) ;
- Tailwind : feuille de style unique avec des variables CSS ;
- KTX2 : l'encodeur n'est pas disponible localement (jalon 8).

## 2. Organisation du code

```
index.html                  point d'entrée de l'expérience 3D
src/main.tsx                monte React
src/app/                    interface (React) : App, store (état partagé), bridge (accès au jeu), ui/*
src/engine/                 rendu (Engine), entrées (Input), collisions (Collision), presets de qualité
src/game/                   orchestration (Game), joueur (Player), caméra 3e personne (ThirdPersonCamera)
src/world/                  monde Nexus Prime : layout, matériaux, kits, île, Command Center, destinations,
                            districts lointains, accessoires, atmosphère, éclairage, shaders (fx, glsl), batch
src/content/profile.ts      contenu professionnel (une seule source, aucune note ni classement)
src/cyberverse/characters/  chargement VRM + clips humanoïdes (Phase 2C), typés par .d.ts
public/assets/              personnages, animations, kits d'environnement (+ CREDITS.md)
tools/env-build/            construction des kits depuis assets-source/ (originaux en lecture seule)
tools/e2e/                  tests de bout en bout, tests d'interface, mesures de performance, captures
tools/world-viewer/         visionneuse de plans fixes du monde (développement)
tools/kit-viewer/           planche contact des pièces de kit (développement)
tools/char-lab/             outils personnages de la Phase 2C
```

**Frontières entre modules**
- L'interface ne charge jamais Three.js. `App.tsx` importe `game/Game` dynamiquement. Le bundle de l'interface pèse 74 Ko compressés ; le moteur, dans un fichier séparé, 306 Ko compressés. Le futur mode recruteur n'importera pas le moteur.
- Le moteur écrit dans un store minimal (`useSyncExternalStore`) : phase, progression, message d'interaction, panneau ouvert, lieu, qualité, FPS. L'interface appelle le jeu via `bridge.game`.
- Le monde ne connaît ni React ni le joueur : il expose des collisions, des points d'interaction et des déclencheurs.

## 3. Rendu et performances

- **Chaîne HDR** : rendu en HalfFloat, MSAA (qualité haute : 4×, moyenne : 2×) ou SMAA (basse), bloom à demi-résolution, tone mapping AgX, vignette.
- **Ombres statiques** : la lune et l'architecture ne bougent pas. La carte d'ombre couvre toute l'île et n'est calculée qu'une fois (`shadowMap.autoUpdate = false`, nouveau calcul seulement au changement de qualité). Les personnages ont une ombre de contact douce. Gain mesuré : l'ombre coûtait environ 12 ms par image.
- **Fusion statique** : l'architecture est fusionnée par couple (matériau, projection d'ombre). Île, districts lointains et flux de données sont aussi fusionnés. On passe de 264 à 58–106 appels de rendu selon la vue.
- **Ciel et nuages précalculés** : texture équirectangulaire sRGB 2048×1024 pour le ciel, bruit périodique 512² pour les nuages. Étoiles et lune restent procédurales.
- **Nombre de lumières constant** : une seule lumière ponctuelle sert d'éclairage de scène à la sélection, puis de lumière d'appoint du joueur. Changer le nombre de lumières recompile tous les shaders ; cela causait un gel de 17 s lors de la transition, corrigé (635 ms).
- **Shaders précompilés** pendant l'écran de chargement (`renderer.compileAsync`).
- **Résolution adaptative** : au-delà de 20 ms par image en moyenne sur 1 s, l'échelle de rendu baisse de 10 % (plancher 0,6). Elle remonte après 4 s confortables.
- **Qualité par défaut** déduite du GPU (WebGL) : GPU intégrés → moyenne, rendu logiciel ou mobile → basse. Choix de l'utilisateur dans le HUD, mémorisé.
- **Textures** : WebP 2K pour les couleurs et normales en qualité haute, 1K ailleurs. Cartes ORM et masques toujours en 1K. Chargement paresseux : seules les textures des pièces livrées sont téléchargées.

## 4. Gameplay

- **Contrôleur** : capsule de 0,30 × 1,62 m contre une BVH statique (2 084 triangles de collision), en deux sous-pas par image.
  - Gravité, détection du sol, accroche aux pentes (chanfrein du socle) et aux petites marches.
  - Glissement le long des murs.
  - Accélération et freinage exponentiels ; rotation amortie vers la direction de déplacement.
- **Allures** :
  - marche à 1,5 m/s (touche C) ;
  - course à 4,3 m/s (par défaut) ;
  - sprint à 6,8 m/s (Maj) ;
  - saut (Espace).
- **Animations** : clips UAL Phase 2C, enchaînés en fondu selon la vitesse. La vitesse de lecture est calée sur la vitesse réelle, à partir des vitesses de *root motion* mesurées sur `UAL1_Standard_RM.glb` (marche 0,975 m/s, course 5,357 m/s, sprint 8,25 m/s), mises à l'échelle de la hauteur de hanches de chaque personnage. Les pieds ne patinent pas.
- **Caméra** :
  - orbite derrière le personnage, à la souris (verrouillage du pointeur ou glisser) ;
  - zoom à la molette, entre 2,2 et 8 m ;
  - léger décalage d'épaule ;
  - suivi lissé, plus souple à la verticale ;
  - collision par rayon BVH : rapprochement immédiat devant un mur, éloignement progressif.
- **Interactions** :
  - porte automatique du Command Center ;
  - table holographique (dossier de l'opérateur) ;
  - portail Est vers l'avant-poste de l'Académie et portail de retour, avec un flash de transition ;
  - panneau d'information du district.

## 5. Lancer, construire, tester

```bash
npm install
npm run dev                      # http://127.0.0.1:5173
npm run build && npm run preview # version de production sur http://127.0.0.1:4173
npm run build:env                # reconstruit les kits (ajouter --all pour toutes les pièces, exploration)

# tests (Edge installé, serveur dev ou preview démarré ; CV_BASE=http://127.0.0.1:4173 pour la production)
node tools/e2e/run-e2e.mjs --operator female|male   # 25 vérifications de bout en bout + mesure de performance
node tools/e2e/run-ui.mjs                           # 14 vérifications d'interface (souris, qualité, aide, redimensionnement, mouvements réduits)
node tools/e2e/perf.mjs --configs presets|adaptive|floor|all
```

Dans le jeu, la touche F3 affiche FPS, temps d'image et appels de rendu. Les tests utilisent aussi `window.__cv`, une API de test : état, téléportation, caméra, bascules de profilage.
