# CYBERVERSE — Sélection des assets d'environnement

Date : 22/11/2026

> Sélection établie à partir des noms, dimensions, nombres de triangles et matériaux lus dans les fichiers glTF. **Aucune pièce n'a encore été assemblée ni affichée** : l'apparence réelle et l'alignement des modules sont à confirmer lors d'une scène de test.

---

## 1. Correspondance besoins → pièces disponibles

Toutes les pièces ci-dessous viennent du **Modular SciFi MegaKit Standard** (`glTF/`), sauf mention « CP » (Cyberpunk Game Kit, `Platforms/` ou `Pickups and Objects/`).

| Besoin | Pièces candidates |
|---|---|
| Bâtiments futuristes (façades) | `WallAstra_*` (Straight, Window, Divided, Corners), `WallBand_*`, `TopPlastic_*`, `TopWindow_*`, `Column_Large_Straight` (10 m), `Column_Astra` |
| Couloirs | `WallAstra_Straight`, `WallWindow_Straight`, `TopCables_Straight`, `BottomMetal_Straight`, sols `Platform_CenterPlate`, `Platform_DarkPlates`, éclairage `Prop_Light_Wide` / `Prop_Light_Corner` |
| Laboratoires de recherche | `WallWindow_*` (vitrages `M_Glass`), `Platform_Window_Wide`, `ShortWall_WhitePlate2_*`, `Prop_Crate3`, `Prop_Chest` (animé), CP `Computer`, CP `Computer_Large` |
| Salles serveurs | `Column_Pipes`, `Prop_PipeHolder`, `Prop_Cable_1` / `Prop_Cable_3`, `TopCables_Straight_Hanging`, `Prop_Vent_*`, `Prop_Fan_Small` (animé), CP `Computer_Large`, CP `TV_*` |
| Centres de commandement | `Platform_Round1` (6 m de diamètre), `Column_MetalSupport_Curve`, `TopWindow_Corner_Curve_*`, CP `TV_1–3`, CP `Computer_Large` |
| Portes et portails | `Door_Frame_Square`, `Door_Frame_SquareTall`, `Door_Metal`, `Door_DarkMetal`, `Door_Simple`, `Door_Frame_Square_Blocked`, CP `Turret_Teleporter` (socle de téléporteur, statique) |
| Plateformes et passerelles | `Platform_*` 4 × 4 m (Metal, Squares, Simple, X, variantes Curve), `Platform_Stairs_2/4/4Wide`, `Prop_Rail_2/3/4`, `Prop_Rail_Round_*`, `Platform_Rails_*` |
| Installations de sécurité | `Door_Frame_Square_Blocked`, `ShortWall_DarkMetal2_*`, `Decal_XSign`, `Decal_Sign`, CP `Fence`, CP `Sign_Corner_Hazard`, CP `Turret_Gun` / `Turret_Cannon` (statiques) |

Les portes du MegaKit **ne contiennent aucune animation** : l'ouverture devra être faite par code (translation du panneau). Seuls `Prop_Chest` (ouverture/fermeture) et `Prop_Fan_Small` (rotation) sont animés.

## 2. Sélection recommandée pour le premier environnement

Premier lieu proposé : **un couloir de laboratoire qui débouche sur une petite salle de commandement** (assez petit pour une première intégration, assez riche pour tester lumière, vitrages, portes et animation).

### 2.1 Liste restreinte (16 pièces)

| # | Pièce | Rôle | Triangles | Dimensions (m) |
|---|---|---|---|---|
| 1 | `Platform_CenterPlate` | Sol principal | 10 | 4 × 4 |
| 2 | `Platform_Squares` | Sol de variation | 24 | 4 × 4 |
| 3 | `WallAstra_Straight` | Mur standard | 355 | 4 × 3 |
| 4 | `WallAstra_Straight_Window` | Mur avec vitrage (labo) | 488 | 4 × 3 |
| 5 | `WallAstra_Corner_Square_Inner` | Angle intérieur | 730 | 4,8 × 4,8 × 3 |
| 6 | `TopCables_Straight` | Haut de mur / plafond technique | 942 | 4 × 2 |
| 7 | `BottomMetal_Straight` | Plinthe | 16 | 4 × 0,6 |
| 8 | `Door_Frame_Square` | Encadrement de porte | 280 | 4,85 × 5 |
| 9 | `Door_Metal` | Panneau de porte (animé par code) | 16 | 2,1 × 4,05 |
| 10 | `Column_Pipes` | Colonne technique (salle serveurs) | 6 480 | 0,9 × 5 |
| 11 | `Platform_Round1` | Estrade de la salle de commandement | 720 | Ø 6 |
| 12 | `Prop_Light_Wide` | Éclairage linéaire | 160 | 1,3 |
| 13 | `Prop_Vent_Big` | Détail de mur/plafond | 328 | 2 × 1 |
| 14 | `Prop_Crate3` | Accessoire | 204 | 1 × 1 × 1 |
| 15 | CP `Computer_Large` | Console de commandement | 2 356 | 1,3 × 2,4 |
| 16 | CP `TV_2` | Écran mural | 336 | 0,8 × 1,2 |
### 2.2 Textures nécessaires (MegaKit)
Les pièces 1 à 14 utilisent principalement les jeux `T_Trim_01`, `T_Trim_02` et `T_Trim_03` (BaseColor, Normal, ORM, + Emissive pour Trim_01) et `T_PaddedWall_*` pour `Column_Pipes`. Ces PNG pèsent de 0,4 à 4 Mo chacun ; ils devront être **redimensionnés (1024–2048 px) et compressés (KTX2/WebP)** lors de l'optimisation.

### 2.3 Points d'attention
1. **Chemins de textures** : les glTF du MegaKit attendent les textures dans le même dossier. La copie de travail devra regrouper `.gltf`, `.bin` et textures, ou réécrire les chemins (sur la copie uniquement).
2. **Mélange de styles** : le MegaKit est en PBR texturé, le Cyberpunk Kit en couleurs unies. Les deux pièces « CP » de la sélection sont à valider visuellement ; si le contraste de style est trop fort, les remplacer par des accessoires MegaKit.
3. **Échelle** : grille MegaKit de 4 m, portes de 4 m de haut. La hauteur des personnages sera à fixer par rapport à cette grille (≈ 1,8 m).
4. **Décals** : les MegaKit `Decal_*` sont des surfaces texturées avec `T_Decals.png` ; à tester plus tard (et `Decal_Line_90` est cassé, voir `ASSET_AUDIT.md`).

## 3. Exclus de cette première sélection
- Les 3 **Aliens** du MegaKit (créatures, hors sujet pour le premier lieu).
- Les grandes plateformes du Cyberpunk Kit (`Platform_4x4`, `Platform_4x2`… 9 900 à 13 300 triangles chacune, style et échelle différents).
- Les FBX, OBJ et `.blend` (sources uniquement).

La ville n'est **pas** construite à cette étape.
