# CYBERVERSE — Rapport de mise à niveau (Visionaries, univers 3D, démarche, mode recruteur)

Date : 22/11/2026 · Branche `feature/cyberverse-foundation` (commits locaux, rien n'est poussé ni déployé).
Spécification du carrousel : `docs/cyberverse/pantheon.md` (« Visionaries »).

## 1. Ce qui a été fait

### 1.1 Visionaries — en-tête du mode recruteur (phases A à D)
- **Scène plein écran** : neuf disques de verre sur un cercle, et la scène du disque du haut en fond. Les neuf scènes sont tes neuf parties : profil, formation, expérience, projets, certifications, Root-Me, compétences, langues, contact.
- **Images** : chaque scène est un vrai rendu du district du campus 3D où vit cette partie. Les images sont générées par `tools/visionaries/build-scenes.mjs`, sans aucune image externe.
- **Géométrie exacte** (§5–§6 de la spécification) :
  - anneau de rayon 0,34·min(L,H) (0,38 sur téléphone), centre décalé de 0,055·H ;
  - disques de taille d0 = 0,17·min(L,H), bornée entre 60 et 184 px (0,21 sur téléphone) ;
  - disque focal agrandi 1,18× et relevé de 7 px.
  - Mesure dans Edge : **0,00 px d'écart** sur les neuf disques, sur ordinateur comme sur téléphone.
- **Moteur** :
  - une seule boucle d'animation, sur le ticker unique de GSAP, possède toutes les transformations ;
  - GSAP n'anime que des valeurs de progression et le conteneur du fond, que la boucle ne touche jamais ;
  - React ne se ré-affiche qu'au changement de scène.
- **Entrée** :
  - floraison du fond en 2,0 s ;
  - enroulement de l'anneau en 2,7 s (rotation initiale de 2,4 rad, rayon qui passe de 0,5 à 1) ;
  - disques échelonnés depuis le haut, puis titre et légende ;
  - tout est stabilisé à environ 2,85 s (la spécification demande environ 3,05 s).
- **Rotation** : 1,0 s en easeInOutExpo (écart mesuré inférieur à 0,01 position), fond en fondu enchaîné sans creux sombre, titre et légende rejoués.
- **Commandes** :
  - glisser à la souris ou au doigt ;
  - lancer rapide projeté selon la vitesse ;
  - toucher un disque ;
  - chevrons ;
  - clavier ;
  - pavé tactile, avec un pas par geste malgré l'inertie ;
  - rotation automatique : 3,6 s par scène, pause de 4,4 s après une action.
- **Verre liquide** :
  - carte de déplacement calculée par la loi de Snell (verre n = 1,5, profil « squircle » convexe, biseau 0,16·d0, épaisseur 34) ;
  - aberration chromatique sur trois canaux isolés (chroma 2,2) ;
  - ondulation en trois sinus d'amplitude 0,38 ;
  - un seul filtre SVG pour les neuf disques, recalculé au redimensionnement.

### 1.2 Mode recruteur — animation de toutes les sections (GSAP + ScrollTrigger)
- **Apparitions au défilement** : le titre se resserre et devient net, puis les blocs de la section apparaissent en léger décalé. Les barres de compétences se remplissent.
- **Cartes de projet et d'expérience interactives** : légère élévation, inclinaison de 2° au maximum et halo qui suit la souris.
- **Survol** : les liens, certificats, figures, étapes de la frise et lignes de contact réagissent de façon soignée au survol.
- **Barre de navigation** : un indicateur glisse sous la section active. Il suit la lecture au défilement, garde la section cliquée et reste visible sur téléphone.
- **Effet de profondeur discret** : l'anneau et le titre de Visionaries se décalent quand on quitte la scène, et la photo de profil bouge légèrement.
- **Textes** :
  - le résumé du profil répétait mot pour mot le titre et le pays affichés juste au-dessus ; il est remplacé par des faits précis (mémoire pfSense, applications web, 11 write-ups Root-Me) ;
  - « and CV » est retiré de la description de la page, puisqu'il n'y a pas de CV.
- **Accessibilité et impression** :
  - le nom est maintenant le titre principal (h1) de la page ;
  - la page imprimée montre tout le contenu, sans le carrousel.

### 1.3 Univers 3D — The Sentinel Nexus (sans reconstruire)
Inventaire : les packs téléchargés sont déjà audités (`ASSET_AUDIT.md`, `ENVIRONMENT_ASSET_SELECTION.md`). Une seule pièce de plus a été utilisée : `Prop_Light_Floor` du MegaKit, qui était déjà dans le build. Aucun pack n'a été importé en entier.
- **Profondeur** : un halo lumineux sous chaque île. Les plateformes flottantes se détachent de la mer de nuages, même de loin.
- **Particules maîtrisées** : un seul nuage de particules suit le district actif. Leur nombre dépend de la qualité choisie (aucune en qualité basse).
- **Lumière animée subtile** : une onde de lumière parcourt les joints du sol toutes les 9 s.
- **Détails choisis** : quatre lampadaires de sol balisent, sur chaque district, le chemin de l'arrivée au portail de retour.
- **Retour d'interaction** :
  - à l'approche d'un terminal, son anneau s'intensifie et une colonne de lumière s'élève ; elle pulse quand le terminal est à portée de la touche E ;
  - les portails s'illuminent à l'approche.
- **Caméra** : après une téléportation, elle part d'un plan plus large et plus haut et se rapproche en 1,6 s. Ce mouvement est désactivé si le mouvement réduit est demandé.

### 1.4 Démarche du personnage (même modèle, même apparence)
Diagnostic du code d'origine :
1. Chaque changement d'allure (arrêt → marche → course) **relançait le clip à zéro** (`reset()`), donc les pieds sautaient d'une phase à l'autre pendant le fondu.
2. Pendant l'accélération, la vitesse traversait la plage « marche » en environ 0,2 s, si bien que deux fondus se chevauchaient.
3. L'accélération était maximale dès la première image : environ 30 m/s² au premier pas de physique.
4. La rotation du corps partait d'un coup, à pleine vitesse.

Corrections :
- **Mélange continu** marche / jogging / sprint, pondéré par la vitesse, avec une phase de pas commune. Les clips sont alignés sur le moment où le pied gauche est le plus en avant, mesuré sur les animations au chargement. Résultat : plus de jambes qui se croisent ni de saut.
- **Cadence** = vitesse au sol / longueur de foulée mélangée, pour éviter que les pieds glissent.
- **Accélération et freinage en courbe en S** : lissage en deux étages. Le premier pas accélère à 7,5 m/s² au lieu d'environ 30, avec un pic de 19 m/s² ensuite.
- **Rotation par ressort amorti critique**, plus lente à pleine vitesse pour des virages plus larges.
- **Légère inclinaison** dans les virages (8° au maximum) et vers l'avant à l'accélération.
- **Sans changement** : physique à 60 Hz fixe avec interpolation, caméra, collisions, saut et toutes les interactions.

## 2. Fichiers

**Créés**
- `src/recruiter/visionaries/` : `geometry.ts`, `glass.ts`, `engine.ts`, `scenes.ts`, `Visionaries.tsx`, `visionaries.css`.
- `src/recruiter/motion.ts`.
- `src/world/ambience.ts`.
- `src/game/Locomotion.ts`.
- `tools/visionaries/build-scenes.mjs`.
- `tools/e2e/run-visionaries.mjs`, `run-recruiter.mjs`, `run-motion.mjs`.
- `public/assets/visionaries/*.jpg` : 9 fonds et 9 vignettes, 1 Mo au total.

**Modifiés**
- `src/recruiter/Recruiter.tsx`, `recruiter.css`, `recruiter/index.html`.
- `src/content/Sections.tsx`, `profile.ts`, `src/styles/sections.css`.
- `src/world/campusWorld.ts`, `NexusWorld.ts`, `fx.ts`, `island.ts`.
- `src/game/Player.ts`, `Game.ts`, `ThirdPersonCamera.ts`.
- `tools/world-viewer/viewer.ts`.
- `package.json` : ajout de `gsap` 3.15.1, licence gratuite incluant ScrollTrigger.

**Non modifiés**
- La page d'accueil (choix du mode).
- Le modèle et l'apparence des personnages.
- Les fichiers d'origine (`assets-source/`).

## 3. Décisions prises (contradictions et adaptations)
| Sujet | Décision |
|---|---|
| Images de la spécification (scènes fantastiques sur un CDN) | Remplacées par des rendus réels du campus, puisque tu demandais des fichiers locaux et pas d'URL inventée. |
| Molette verticale (la spécification la captait) | Elle fait défiler la page, comme tu le demandais. Seuls le geste horizontal et Maj + molette font tourner l'anneau. ↑/↓ ne tournent que si le focus clavier est dans le carrousel. |
| Lancer rapide ou clics répétés | Les clics s'additionnent, et le mouvement repart avec sa vitesse au lieu de se figer. L'easeInOutExpo de 1,0 s reste utilisé pour chaque pas parti de l'arrêt. |
| Une seule image par scène (spécification) | Vignettes séparées de 800 px pour les disques : la page est plus légère. |
| Recruteurs pressés | Un lien « Open … » sous la légende ; toucher le disque du haut ouvre sa section ; repère « Full portfolio » en bas. |
| Hauteur 100vh | 100svh, pour que l'anneau reste entier sous les barres des navigateurs mobiles. |
| GPU faibles | Si le verre réel fait passer la page sous environ 22 images/s, les disques basculent automatiquement en verre dépoli. |

## 4. Problèmes trouvés et corrigés
1. **Image noire** : `pow()` appliqué à un nombre négatif dans l'onde lumineuse du sol produisait un résultat invalide (NaN) sur les cartes graphiques D3D. Corrigé.
2. **Focus clavier** : après un clic souris sur un chevron, le bouton gardait le focus. Il captait alors ↑/↓ et bloquait la rotation automatique pour toujours. Désormais, seul le focus clavier compte.
3. **Navigation sur téléphone** : les figures du mémoire se chargeaient sans dimensions réservées. La page « sautait » et la section active devenait fausse. Les dimensions sont maintenant réservées, et les déclencheurs sont recalculés quand la hauteur change.
4. **Indicateur de section** : il disparaissait entre deux sections, et la dernière section n'était jamais active. Les zones sont maintenant contiguës, avec la règle « bas de page = Contact ».
5. **Rendus de l'outil de capture** : l'image prise juste après un changement de district pouvait sortir noire, le temps que les shaders se compilent. Des images de préchauffage sont ajoutées dans l'outil (le jeu, lui, masque ce moment par le flash de téléportation).
6. **Charge du carrousel** :
   - il s'arrête quand il est hors écran (plus de boucle ni de verre) ;
   - il n'écrit rien dans la page quand rien ne bouge ;
   - les fonds invisibles ne sont plus dessinés.

## 5. Vérifications finales
*(version de production servie par `vite preview`, Edge sans affichage avec le vrai GPU Intel UHD)*

| Suite | Résultat | Environnement |
|---|---|---|
| Visionaries (`run-visionaries.mjs`) : géométrie, entrée, rotation, glisser, lancer, toucher, clavier, molette et pavé, rotation automatique, verre réel (écart mesuré sur l'anneau : 7,7 / 255, visage du disque intact), repli Firefox / Safari / `?glass=frost`, mouvement réduit, téléphone 390×844 | **50 / 50** | production |
| Mode recruteur (`run-recruiter.mjs`) : 10 sections, 32 liens GitHub, apparitions, navigation active, carte interactive, profondeur, défilement à **67 images/s** (p95 20,9 ms), impression, mouvement réduit, 1440×900 et 390×844 | **23 / 23** | production |
| Démarche (`run-motion.mjs`) à 60, 30 et 20 images/s : courbe en S, vitesse régulière (variation 0–4 %), poids jamais brusques, virages, même distance quelle que soit la cadence (écart 1,6 %) | **25 / 25** | serveur de développement |
| Parcours 3D complet NEON FIGHTER + (`run-e2e.mjs`) | **32 / 32**, 67,9 images/s sur la course scriptée | serveur de développement |
| Qualité à résolution fixe, 1600×900 | Haute 33,6 · Moyenne 39,7 · Basse 46 images/s (avant : 33 · 37 · 43,8) | production |

⚠ **Non relancés** après les dernières retouches (correction du NaN, halos atténués, navigation) : le parcours 3D avec Cyber JT, l'interface (17 vérifications) et le tactile (7). La campagne finale a été **arrêtée par le système, faute de mémoire libre**, pendant le parcours 3D. Ces suites passaient avant ces retouches ; à relancer une par une quand la mémoire le permet.

## 6. Limites restantes
- **Safari et Firefox** n'ont pas été testés en vrai : le repli en verre dépoli est vérifié dans Edge en imitant leur identité, mais leur rendu réel n'a pas été vu.
- **Pavé tactile Mac** simulé par des événements de défilement, pas avec un vrai pavé.
- **Téléphone** émulé (toucher simulé) : à essayer sur un vrai appareil.
- **Pieds** : ils ne s'ajustent pas au sol en pente ou sur les marches (pas d'IK). Le glissement est réduit par la cadence, pas supprimé à 100 %.
- **Polices** : Poppins et Geist viennent de Google Fonts. Si elles sont bloquées, des polices système les remplacent.
- **Musique et verrouillage du pointeur** : non vérifiables sans affichage (déjà signalé).

---

## 7. Mise à jour du soir — mode recruteur en « mondes » (22/11/2026)

À ta demande :
- **Description courte** : « Cybersecurity graduate passionate about network security, AI security, and building practical solutions to real-world security challenges. » Elle remplace le résumé long, dans le mode recruteur et dans le dossier 3D.
- **Chaque monde ouvre sa propre page** (`/recruiter/#/education`…), au lieu de faire défiler vers le bas de la page :
  - **transition au ralenti** : un cercle s'ouvre depuis le disque, va vite, ralentit fortement au milieu, puis remplit l'écran (1,9 s, ease GSAP *SlowMo*). Pendant ce temps, l'anneau derrière avance et se floute, et le contenu apparaît en passant du flou au net ;
  - **navigation** : flèches ← → (boutons et clavier), « All worlds », Échap ou le bouton Retour du navigateur referment la page et ramènent ce monde en haut de l'anneau ;
  - **lien partageable** : on peut envoyer directement le lien d'un monde.
- **Site court** : les longues sections qui recopiaient GitHub sont supprimées.
  - Il reste l'anneau, une ligne de pied de page et neuf résumés.
  - Chaque résumé a un gros bouton vers la bonne page GitHub : profil, README, projets, certificats, write-ups, compétences.
  - Les détails (méthode du mémoire, tableau Root-Me, figures) restent sur GitHub.
- **Compétences sans niveaux**. Outils ajoutés d'après le mémoire (implémentation et tests uniquement, pas les « perspectives ») : Squid + SquidGuard, pfBlockerNG, SARG, Dual-WAN failover, RSTP & Port Security, VMware Workstation, Nmap, 802.1X / RADIUS (WPA-Enterprise).
- **Typographie et animations** inspirées de ta vidéo, avec tes couleurs :
  - police Geist, grasse et serrée, phrases courtes terminées par un point (« One network, rebuilt. », « Break it. Explain it. ») ;
  - chiffres géants qui défilent avec un flou de mouvement (6, 11, 2026…) ;
  - grand mot en fond derrière le visuel, halo lumineux dessous, apparitions floues qui deviennent nettes.
- **Impression** : un résumé imprimable de tous les mondes.
- Les langues parlées gardent leur niveau court (natif, B2, en apprentissage). J'ai compris « langages » comme les langages de programmation. Si tu voulais parler des langues, c'est une ligne à changer.

Corrections faites au passage :
- l'animation de plongée démarre une fois la page prête : sa première image n'est plus sautée ;
- un clic rapide sur « suivant » pendant une transition fonctionne ;
- la rotation automatique ne reste plus bloquée après la fermeture d'un monde à la souris ;
- les poids d'animation négligeables sont mis exactement à zéro, pour que le mixer ne calcule pas d'animations invisibles.

### Vérifications de ce soir (version de production)
| Suite | Résultat |
|---|---|
| Mondes (`run-recruiter.mjs`) : plongée au ralenti (rayon 61 px → plein écran ; 1,14 px/ms au départ, 0,07 au milieu), 9 mondes et liens GitHub, compteurs, flèches, Retour, lien direct, téléphone, mouvement réduit, impression | **22 / 22** |
| Visionaries (`run-visionaries.mjs`) | **51 / 51** |
| Parcours 3D, NEON FIGHTER + et Cyber JT | **32 / 32** chacun |
| Interface | **17 / 17** |
| Tactile | **7 / 7** |
| Démarche à 60, 30 et 20 images/s | **25 / 25** |

Performance : 54,6 images/s (NEON FIGHTER +) et 50,5 (Cyber JT) sur la course scriptée, contre 67,9 à midi **pour le même code de démarche**. La machine était chargée pendant ces mesures : uTorrent tournait, avec une charge de 27 % au repos. Une mesure sur une machine au repos reste à faire.

---

## 8. Fluidité, photo, mode immersif et téléphone (22/11/2026, nuit)

**Transitions plus rapides et fluides** (mesurées dans Edge, GPU Intel UHD) :

| Transition | Avant | Après |
|---|---|---|
| Plongée dans un monde | 1,9 s avec un plateau « slow-mo » ; 17 images par seconde, pics à 140 ms | ≈ 1 s en courbe douce, 64 images, p95 20 ms |
| Changement de monde | p95 42 ms, pics à 104 ms | p95 21 ms, pire 35 ms |
| Fermeture | 1,05 s | 0,7 s, ≈ 7 ms par image |
| Pas de l'anneau | 1,0 s, avec un temps mort au départ (expo) | 0,75 s, démarre dès la 1re image (ease-out) |

Causes trouvées à la trace de performance et corrigées :
1. Les 9 disques en verre réfractant étaient recalculés à chaque image, même sous la transition. L'anneau est maintenant figé, sans verre, pendant les transitions, puis masqué une fois couvert.
2. Le cercle découpait toute la page (`clip-path`), ce qui forçait à redessiner textes, ombres et masques à chaque image. Il est remplacé par une lentille ronde : un cercle agrandi par simple transformation, que le GPU anime sans redessiner.
3. Le contenu masqué par `visibility` n'était dessiné qu'au moment d'apparaître, d'où des pics au milieu de l'animation. Il est maintenant gardé à une opacité de 0,01, préparé à l'avance.
4. Coûts de premier usage :
   - police : Geist est maintenant hébergée avec le site, au lieu de Google Fonts qui pouvait bloquer le chargement de la page ;
   - effets GPU : ils sont compilés pendant l'écran noir de l'arrivée.
5. Chaque animation démarre quand le navigateur rend de nouveau des images régulières (au plus 0,3 s d'attente).
6. Coût du verre : seuls les 3 disques du haut gardent la lentille complète avec franges colorées ; les 6 autres ont une lentille en une passe.

**Photo de profil** : recadrée pour un cercle, à partir de l'original (resté intact dans `assets-source/`) : visage centré, marge au-dessus de la tête, épaules en bas, sans le bord gris de la capture.

**Mode immersif = mêmes textes** :
- les terminaux des districts ouvrent les mêmes résumés que les mondes du mode recruteur : même police, mêmes compteurs, mêmes boutons GitHub ;
- ils s'affichent en panneau latéral sur ordinateur, en plein écran sur téléphone, avec des onglets quand un district présente deux parties (Formation / Langues, Projets / Expérience, Certifications / Root-Me) ;
- la typographie Geist est utilisée partout, y compris pour les textes holographiques en 3D ;
- l'accueil reprend la description courte.

**Téléphone** :
- balayage gauche / droite entre les mondes ;
- boutons d'au moins 44 px ;
- panneaux 3D en plein écran ;
- l'accueil défile correctement sur les petits écrans ;
- il n'y a aucun débordement horizontal.

**Vérifications** (version de production) :

| Suite | Résultat |
|---|---|
| Mondes | 24 / 24 |
| Visionaries | 51 / 51 |
| Interface | 17 / 17 |
| Parcours 3D, NEON FIGHTER + et Cyber JT | 32 / 32 chacun (61,5 et 60,5 images/s) |
| Tactile | 7 / 7 |
