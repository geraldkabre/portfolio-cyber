# CYBERVERSE — Personnages candidats (homme / femme)

Dernière mise à jour : 22/11/2026 (Phase 2)
Statut : **aucun personnage validé ni jouable.** Aucun modèle n'a été téléchargé, ouvert dans un viewer 3D ou testé. Rien n'a été acheté.

> Ce document remplace la version de Phase 1. Les packs **Quaternius Ultimate Modular Men / Women** y étaient « recommandés » : ils sont désormais **rétrogradés au rang de candidats préliminaires non approuvés** (style low-poly à facettes, personnages livrés en 4 parties à assembler, ce qui est incompatible avec l'interdiction d'assemblage).

---

## 0. Exigences de référence (Phase 2)

| Exigence | Détail |
|---|---|
| Composition | Exactement 1 homme + 1 femme |
| Style | Personnages de jeu vidéo stylisés et soignés, proportions légèrement cartoon |
| Tenue | Techwear cyberpunk premium : bleu marine foncé, accents cyan / bleu électrique, détails violets ; chaussures, pantalon et veste complets |
| Qualité | Cheveux et visage de qualité, matériaux texturés de façon professionnelle |
| Livraison | Modèle **complet et fini** : pas de modélisation, pas de vêtements à créer, pas de personnalisation, **pas d'assemblage de parties**, pas de modèle de base nu, pas de Blender pour créer |
| Technique | Riggé, animable, GLB/glTF ou format compatible |
| Droits | Licence autorisant l'usage commercial, téléchargement gratuit |

## 1. Méthode

| Étape | Ce qui a été fait réellement |
|---|---|
| Assets locaux | Ré-inspection de `assets-source/` : rien de nouveau depuis la Phase 1 (seul humanoïde : `Character.gltf`, écarté) |
| Outils de génération dans l'environnement | Vérification des serveurs MCP et des outils disponibles |
| Sketchfab | **API publique** : 44 requêtes, 1 064 modèles téléchargeables récupérés, filtrage automatique (licence commerciale, animé/riggé, < 250 k triangles, non réservé aux adultes), puis examen visuel des **images d'aperçu** de 51 modèles et des fiches détaillées des finalistes |
| VRoid Hub | **API publique** : 20 mots-clés, 1 497 modèles, filtrage sur les droits déclarés par chaque auteur (téléchargeable, utilisable par des tiers, usage commercial), examen visuel de 24 aperçus |
| Services de génération | Pages officielles (quand elles sont accessibles) et recherches web |

« Vérifié » ci-dessous signifie : lu dans les métadonnées officielles (API) ou sur la page de l'auteur. Le rig, la qualité réelle des textures et le rendu dans Three.js **ne sont pas vérifiés** tant que les fichiers n'ont pas été téléchargés et testés.

Les aperçus et les données brutes sont conservés localement (dossier ignoré par Git) : `assets-source/_research-previews/phase2/`.

## 2. Génération 3D par IA : conclusion

| Piste | Constat | Verdict |
|---|---|---|
| Outil intégré à Claude Code | **Aucun.** Aucun serveur MCP configuré (`~/.claude.json`, réglages du projet) ; les seuls connecteurs sont Docs, Gmail et Calendar. Aucun outil text-to-3D ou image-to-3D n'est disponible ici. | ✘ |
| **Meshy** (offre gratuite) | Page d'aide officielle : en gratuit, *« Textured models »* ne sont **pas téléchargeables** ; seuls 10 modèles **non texturés** Meshy 6 Lite par mois le sont. Licence des sorties gratuites : CC BY 4.0 (usage commercial avec crédit). | ✘ Pas de modèle texturé téléchargeable gratuitement |
| **Tripo** (offre gratuite) | Page de tarifs officielle inaccessible (403). Sources secondaires concordantes : offre gratuite **non commerciale**, modèles publics. | ✘ (à confirmer, mais exclu par prudence) |
| **Hunyuan3D** (open source, Tencent) | Licence communautaire **excluant l'Union européenne, le Royaume-Uni et la Corée du Sud** ; génère un maillage sans squelette ; nécessite un GPU ou un Space en ligne. | ✘ |
| Limite générale | La génération image→3D produit un maillage **unique et fusionné** (corps + vêtements + cheveux), sans rig facial. La qualité des visages et des cheveux est incertaine, et un auto-rig serait nécessaire. Une image générée n'est **pas** un modèle 3D. | — |

**Conclusion :** aucune génération gratuite ne peut produire ici deux personnages texturés, riggés, téléchargeables et utilisables commercialement. Les services capables de le faire exigent une offre **payante**, ce qui n'est pas autorisé sans votre accord.

## 3. Candidats réels trouvés

Aucun candidat ne coche **toutes** les exigences. Voici les meilleures options vérifiées, regroupées **par paires cohérentes**.

### Paire A — « Citizens of a dystopic future » (automatrio, Sketchfab) ⭐ meilleur rendu visuel

| | **Homme : « Robert »** | **Femme : « Julieta »** |
|---|---|---|
| Lien | https://sketchfab.com/3d-models/01966360b609405db6bde50fefd230cd | https://sketchfab.com/3d-models/3f04c5d93d184ada8e3dd23f059504db |
| Licence | CC BY 4.0 : usage commercial autorisé, crédit obligatoire | CC BY 4.0 |
| Aperçu observé | Stylisé, proportions légèrement exagérées, barbe ; veste sombre avec **liserés néon cyan** | Stylisée, cheveux sarcelle ; tenue bleu-gris, chaussures jaunes ; ventre partiellement découvert |
| Triangles | 27 210 | 24 878 |
| Matériaux / textures | 10 / 29 (1–2K d'après l'auteur) | 8 / 28, PBR metalness |
| Rig (déclaré) | Rigify (contrôleurs, IK) | **Non riggé dans la version Sketchfab** : *« I couldn't get the rigged export to upload into Sketchfab, but the .blend file … contains the Rigify rig »* |
| Animations | 0 | 0 |
| Formats proposés | glTF, GLB (42,7 Mo), USDZ, source | glTF, GLB (37,2 Mo), USDZ, source (.blend) |
| Publication | 21/11/2020 | 07/12/2020 |

**Points forts :** même auteur et même série, donc cohérence visuelle garantie ; style « jeu vidéo stylisé » ; palette sombre avec cyan (Robert) ; textures complètes.
**Points bloquants à arbitrer :**
1. ⚠ **Corps complet caché sous les vêtements** par un masque de transparence (déclaré par l'auteur pour les deux). Visuellement habillés, mais un corps nu existe dans le fichier. Si le masque est mal interprété dans Three.js, il pourrait apparaître.
2. ⚠ **Julieta n'est riggée que dans le `.blend`** : il faudrait un **export depuis Blender** (aucune modification, mais une utilisation de Blender).
3. ⚠ Fichiers lourds (37–43 Mo) : optimisation obligatoire.
4. Pas de violet ; Julieta a des chaussures jaunes.

### Paire B — Avatars VRoid Hub (format VRM) ⭐ la plus « prête à l'emploi » techniquement

Le VRM est un glTF 2.0 avec un **squelette humanoïde standardisé** et des expressions faciales. Il se charge dans Three.js avec `@pixiv/three-vrm`, et le retargeting d'animations y est bien documenté.

| | **Femme : « NEON FIGHTER + » (kana~)** | **Homme : « Cyber JT » (Jonh Tinoco)** |
|---|---|---|
| Lien | https://hub.vroid.com/characters/1731822748557317042/models/1819146148563416740 | https://hub.vroid.com/characters/6630547218766236721/models/4402901750781022786 |
| Conditions déclarées par l'auteur (API) | Usage par des tiers : tous · commercial personnel : oui · commercial entreprise : oui · modification : oui · redistribution : oui · crédit : non requis | Identiques |
| Aperçu observé | Style anime, **sweat à capuche noir à motif cyan**, cheveux bleu/cyan, **oreilles de chat** | Style anime, sweat à capuche noir, lunettes ; tenue urbaine plutôt que techwear premium |
| Popularité | 246 ♥, 391 téléchargements | 15 ♥, 80 téléchargements |
| Triangles / textures | non indiqués par l'API | non indiqués |
| Rig | Humanoïde VRM (standard du format, **à confirmer sur le fichier**) | idem |
| Animations | Aucune incluse (normal pour le VRM) | idem |

**Variantes du même auteur (femme) :** « NEON FIGHTER + X », « Neon blue!! » (mêmes conditions).
**Autres hommes envisageables :** « サイバースパイ Sample_C » (combinaison noire à lignes rouges, visage masqué), mais **redistribution interdite**, ce qui pose problème pour un site public.

**Points forts :** droits très permissifs et explicites ; rig standardisé identique pour les deux ; cheveux et visages de bonne qualité (style anime) ; palette cyan/noir pour la femme.
**Points faibles :** style **anime**, et non « jeu vidéo stylisé occidental » ; oreilles de chat sur la femme (non retirables sans modifier le maillage) ; homme peu « techwear premium » ; deux auteurs différents.

### Paire C — « asset_for_games » (Sketchfab) — option technique de repli

| | **Homme : « male character #1 »** | **Femme : « The woman of the future 2 »** |
|---|---|---|
| Lien | https://sketchfab.com/3d-models/d495207b039e469f947ab2c1c0582760 | https://sketchfab.com/3d-models/9beb61fc17394fc3b65275556eabc31d |
| Licence | CC BY 4.0 | CC BY 4.0 |
| Aperçu observé | Armure/combinaison sci-fi gris-bleu, lunettes, barbe | Combinaison **bleu marine foncé**, cheveux blancs, accessoire à cornes |
| Triangles / textures | 18 985 / 13 | 16 804 / 3 |
| Rig / animations | Riggé (tags), 1 animation | Riggée (tags), 1 animation |
| GLB | 4,8 Mo | 2,3 Mo |

Variante femme : « The woman of the future (animated) », [lien](https://sketchfab.com/3d-models/b0bab048c73d45309b94de6e07b59d2d), 18 576 triangles, 10 animations d'après la description, avec un manteau noir et une visière cyan.
**Points forts :** même auteur, riggés et animés, légers, palette sombre.
**Points faibles :** finition visiblement **plus simple** (qualité « moyenne » sur les aperçus) ; pas de cyan ni de violet marqués.

### Candidats isolés notables (sans partenaire du sexe opposé assorti)

| Modèle | Sexe | Licence | Remarque |
|---|---|---|---|
| [Cyberpunk character — 3d_Bob](https://sketchfab.com/3d-models/019f4b3fd3c74ed0bc6c8dbe9cd50d51) | H | CC BY | Techwear sombre très réussi (63 749 téléchargements), mais **visage masqué**, style réaliste, rig « pour poser » selon l'auteur, GLB de 78,6 Mo |
| [Cyber Girl — Rotmill](https://sketchfab.com/3d-models/46640796f0dd4fbab5eba5262d542e25) | F | CC BY | Anime de grande qualité, tenue blanche avec ventre découvert ; aucun homme assorti |
| [Taila — Partaevil](https://sketchfab.com/3d-models/8ae231b61fc34827be30e2a1edc5b811) | F | CC BY | Anime original, marine/orange, GLB de 2,8 Mo ; aucun homme assorti |

### Exclus et pourquoi
- **Fan-arts de personnages protégés** (League of Legends, Evangelion, Cyberpunk 2077, Spider-Verse, Genshin, etc.) : risque de propriété intellectuelle, même sous licence CC. « Lan Laffinty » (VRoid/Sketchfab) en fait partie.
- **Licences non commerciales** (CC BY-NC), **modèles générés par IA** (RapidAssets, « [MESHY] »), **avatars ReadyPlayerMe** republiés (droits incertains), **ré-uploads probables** (« cyber-girl » de hanjisung42698, même nombre de triangles que celui de Rotmill), modèles **probablement extraits d'un jeu** (« Cyber Hunter »).
- **Tenues incomplètes** (« A man from the future » : torse nu sous un gilet ouvert).
- **Offres payantes** (O.W. « Midpoly Cyberpunk Female », 6,99 € ; CGTrader, Fab, RenderHub).
- **Quaternius Ultimate Modular Men/Women** : low-poly et en 4 parties à assembler.
- **Mixamo** : catalogue accessible seulement avec un compte Adobe, non vérifiable d'ici. Réserve sur la redistribution de fichiers bruts sur un site web.

## 4. Accès aux téléchargements (vérifié)
- **Sketchfab** : l'API de téléchargement répond **HTTP 401** sans authentification. Un **compte Sketchfab gratuit** est nécessaire. Je ne peux pas me connecter à votre place.
- **VRoid Hub** : les métadonnées sont publiques ; le téléchargement passe par un compte pixiv (non testé).

## 5. Recommandation

Aucune option gratuite ne satisfait **toutes** les exigences en même temps. Les deux meilleures pistes à tester réellement sont :

1. **Paire A (Robert + Julieta)** : la plus proche du style visé. Elle demande deux arbitrages de votre part : le corps masqué sous les vêtements, et l'export du rig de Julieta depuis Blender.
2. **Paire B (NEON FIGHTER + / Cyber JT, VRM)** : la plus propre juridiquement et techniquement, mais en style anime.

La paire C reste un repli si les deux premières échouent au test.

**Validation à faire après téléchargement (par vous, avec vos comptes) :** placer les fichiers dans `assets-source/04-characters-candidates/<nom>/` (ignoré par Git), puis :
1. analyse automatique (triangles, matériaux, textures, squelette, animations) ;
2. **rendu réel** dans un viewer glTF/VRM avec captures d'écran ;
3. test de lecture de `Idle_Loop` / `Walk_Loop` (Universal Animation Library) ;
4. vérification que rien n'apparaît sous les vêtements (paire A).

Aucun personnage ne sera déclaré jouable avant ces tests.

## 6. Crédits à prévoir (si retenus)
- CC BY 4.0 (Sketchfab) : nom du modèle, auteur, lien et licence, à afficher dans une page « Crédits » du site.
- VRoid (paire B) : crédit non requis, mais recommandé.

## Sources
- API Sketchfab : `https://api.sketchfab.com/v3/search` et `/v3/models/{uid}` (consultées le 22/11/2026)
- API VRoid Hub : `https://hub.vroid.com/api/search/character_models` (consultée le 22/11/2026)
- Meshy, offre gratuite : https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan
- Licence Hunyuan3D 2.0 : https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE
- Comparatifs Tripo (sources secondaires) : https://www.aimiracle.ai/ai-tool-review/tripo-ai-review/ · https://skipthecad.com/generators/tripo-ai/
- FAQ Mixamo : https://helpx.adobe.com/ca/creative-cloud/faq/mixamo-faq.html
- Phase 1 : https://quaternius.com/packs/ultimatemodularcharacters.html · https://quaternius.com/packs/ultimatemodularwomen.html · https://owsam.itch.io/mpcyberpunkfemale01
