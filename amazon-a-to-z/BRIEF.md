# From A to Z : brief de production (phase 1)

Pub spec Amazon · **LOIC DESIGN** · 19,2 s + carte de fin 2 s = 21,2 s · 60 fps (1272 images)
Formats : 16:9 1920×1080 et 9:16 1080×1920 (vraie mise en page, pas un recadrage)
Spec ad, non affiliée à Amazon.

## L'idée
Le sourire Amazon est une flèche de a à z. **Une seule ligne de lumière orange (#FF9900)** porte tout l'achat :
logo → champ de recherche → bouton Buy Now → itinéraire de livraison → sourire imprimé sur le carton → flèche A → Z → retour dans le logo.
Elle est dessinée partout par **une seule fonction partagée** `draw_line(path, t_head, t_tail, heat)` (cœur blanc chaud, halo orange, traînée, tête brillante).

## Look
- Fond #070707, halo ambre chaud qui respire, coin Squid Ink #232F3E, grain fin.
- Un seul accent : #FF9900 (la ligne, au plus un mot par phrase).
- App Amazon mode sombre refaite à l'œil : fond #0F1111, cartes #212426, Buy Now #FFA41C, Add to Cart #FFD814.
- Typo : SF Pro Display Bold (titres) / SF Pro Text (interface). Police officielle Apple téléchargée et installée.
- Flou de mouvement fort, faible profondeur de champ, caméra qui dérive toujours, easings longs. Un seul plan continu, zéro cut.

## Timing image par image (60 fps)

| Scène | Secondes | Images | Ce qui se passe | Voix |
|---|---|---|---|---|
| S1 L'impact | 0,00–1,60 | 0–95 | Image 0 déjà en mouvement : le sourire fonce vers la caméra, traînée de lumière. **SLAM sous le logotype à 0,17 (img 10)** : secousse, éclats, sub. Sa lumière court a → z et révèle le logo officiel (0,23–0,67 · img 14–40). Logo au repos. | 0,50 « Anything you can think of… » |
| S2 Recherche | 1,60–4,80 | 96–287 | Le logo monte et s'efface, une copie de lumière se détache. iPhone titane monte et se pose **sur le temps à 2,40 (img 144)**, la ligne devient la ligne de focus du champ. « wireless headphones » se tape avec autocomplétion (2,50–3,30 · img 150–198). 6 cartes résultats sortent de l'écran en vraie 3D, s'éventaillent et se posent (3,40–4,37 · img 204–262). La ligne contourne la carte 1, la caméra pousse. | 2,67 « …is one search away. » |
| S3 Un tap | 4,80–7,20 | 288–431 | Fiche produit (photo, étoiles, $129<sup>99</sup>, FREE delivery Today). Caméra glisse vers Buy Now, la ligne devient son remplissage (5,50–5,97 · img 330–358). **TAP à 6,03 (img 362)**, « Order placed, thank you. » La ligne jaillit, la caméra traverse l'écran. | 5,40 « One tap… » · 6,60 « and it's already on its way. » |
| S4 L'itinéraire | 7,20–10,00 | 432–599 | **Drop à 7,20** : l'écran devient une ville de nuit vue du dessus, les blocs montent, caméra en 3/4. La ligne trace la route dans les rues jusqu'à une épingle maison orange (9,60 · img 576). Carte verre « Arriving today » + suivi 4 étapes. Plongée dans le flou. | — |
| S5 La porte | 10,00–13,30 | 600–797 | Seuil de porte de nuit, carton kraft en lévitation. La ligne court sur les lattes, entoure le carton une fois et se pose sur sa face en sourire (10,83 · img 650), de la lumière à l'encre imprimée. Le carton se pose sur le mot « door » (12,00 · img 720). Notification iOS « Delivered ». | 11,20 « Right to your door. » |
| S6 A à Z | 13,30–16,50 | 798–989 | « Everything you love. » lettres remplies de photos produits, puis blanc, « love » en orange. Se reforme en « From A to Z. », la flèche court sous le A jusqu'au Z et remonte comme le sourire (15,20–16,00 · img 912–960). | 13,50 « Everything you love… » · 15,10 « from A to Z. » |
| S7 Héros | 16,50–19,20 | 990–1151 | Respiration (musique coupée). **Hit à 16,80 (img 1008)** : la flèche se loge dans le sourire officiel, le logotype se révèle a → z. Logo vivant, lumière lente dessous. Défocus, la tête de flèche devient un point. | 17,50 « Amazon. » |
| S8 Fin | 19,20–21,20 | 1152–1271 | **LOIC DESIGN**. En petit : « Spec ad · not affiliated with Amazon ». | — |

## 9:16
Téléphone plus grand (≈ 78 % de la largeur), éventail de cartes plus serré (2 × 3), textes S6 sur 2 lignes (« Everything / you love. », « From A / to Z. »), ville cadrée verticalement, logo à 80 % de la largeur. Marges de sécurité 6 %.

## Assets (récupérés)
- **Logo** : logo officiel Amazon (Wikimedia), version inversée pour fond sombre (logotype blanc, sourire orange #FF9900). Calques séparés logotype / sourire pour la révélation. Jamais redessiné ni recoloré au-delà de la version inversée officielle ; au pixel près au repos, rien par-dessus.
- **Photos** (Unsplash, sans marque visible) : casques hp3, hp4, hp6, hp8 ; produits coffee, lamp, mug, plant, watch. J'ai écarté tout ce qui montrait une marque (Sony, Chanel, Nike, Ray-Ban, sac « Levels »…). Produit fictif : « Aura Wireless Headphones », boutique fictive.
- **Polices** : SF Pro Display / Text (Apple). Non versionnées dans Git (licence Apple).
- **Voix** : Higgsfield → ElevenLabs, dite en une seule fois. 2 voix testées, chaque phrase placée à son temps.
- **Bruitages** : pas de bibliothèque utilisable ici (le générateur SFX Higgsfield est réservé aux jeux), donc ~90 sons **fabriqués en code** : impact + sub, ticks, swipes, clic + carillon, whooshes, thud carton, pop notif.
- **Musique** : en code, 100 BPM, fa majeur, structure du prompt (drop 7,20, lift 12,00, souffle 16,50, accord + low hit 16,80).

## Mix
Voix ≈ –16 LUFS, musique toujours ≥ 12 dB sous la voix, master –14 LUFS / –1,25 dBTP. Rien d'autre que le hit dans ±60 ms autour de 16,80.

## Suite
1. ✅ Brief + assets + voix (ce document)
2. Moteur 2.5D + fonction ligne unique, rendu par scènes
3. Premier aperçu 16:9 basse déf + planche contact
4. Une passe de corrections (vérif image par image)
5. 9:16, finals, stems audio
