// Moteur de visuels du studio. Les créations sont composées ici, dans un canvas,
// à partir de la vraie photo du produit : le produit n'est jamais redessiné,
// et les textes et les prix restent exactement ceux saisis par le commerçant.
import { MARQUE_PAR_DEFAUT, ModeleId, Organisation, Produit, TextesCreation } from '../platform/types';
import { formatFCFA } from '../utils';

export interface Format {
  id: 'carre' | 'portrait' | 'story' | 'paysage';
  label: string;
  usage: string;
  w: number;
  h: number;
}

export const FORMATS: Format[] = [
  { id: 'carre', label: 'Carré', usage: 'Publication Facebook, Instagram', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait', usage: 'Fil Instagram, Facebook', w: 1080, h: 1350 },
  { id: 'story', label: 'Story', usage: 'Statut WhatsApp, story, Reels', w: 1080, h: 1920 },
  { id: 'paysage', label: 'Paysage', usage: 'Publicité Facebook, lien', w: 1200, h: 628 },
];

export const MODELES: { id: ModeleId; label: string; description: string }[] = [
  { id: 'affiche', label: 'Affiche', description: 'La photo en plein cadre, le texte par-dessus' },
  { id: 'promo', label: 'Promo', description: 'Fond aux couleurs de la marque, idéal pour une offre' },
  { id: 'epure', label: 'Épuré', description: 'Fond clair, sobre, met le produit en valeur' },
];

export interface Spec {
  modele: ModeleId;
  accroche: string;
  sousTitre: string;
  /** Prix affiché, déjà formaté ; vide pour le masquer. */
  prix: string;
  /** Ancien prix barré ; vide s'il n'y a pas de promotion. */
  ancienPrix: string;
  badge: string;
  cta: string;
  contact: string;
  marque: string;
  primaire: string;
  secondaire: string;
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

const FAMILLE = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const police = (poids: number, taille: number) => `${poids} ${Math.round(taille)}px ${FAMILLE}`;

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Couleur de texte lisible sur le fond donné. */
const texteSur = (fond: string) => (luminance(fond) > 0.45 ? '#111827' : '#ffffff');

function couper(ctx: CanvasRenderingContext2D, texte: string, largeurMax: number): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texte.split('\n')) {
    let ligne = '';
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (ligne && ctx.measureText(essai).width > largeurMax) {
        lignes.push(ligne);
        ligne = mot;
      } else {
        ligne = essai;
      }
    }
    if (ligne) lignes.push(ligne);
  }
  return lignes;
}

/** Réduit la taille jusqu'à tenir dans la largeur et le nombre de lignes voulus. */
function ajuster(ctx: CanvasRenderingContext2D, texte: string, largeurMax: number, lignesMax: number, taille: number, tailleMin: number, poids: number) {
  let t = taille;
  for (;;) {
    ctx.font = police(poids, t);
    const lignes = couper(ctx, texte, largeurMax);
    const deborde = lignes.some((l) => ctx.measureText(l).width > largeurMax);
    if ((lignes.length <= lignesMax && !deborde) || t <= tailleMin) {
      if (lignes.length > lignesMax) {
        const gardees = lignes.slice(0, lignesMax);
        gardees[lignesMax - 1] = gardees[lignesMax - 1].replace(/[\s.,;:!?]*$/, '') + '…';
        return { taille: t, lignes: gardees };
      }
      return { taille: t, lignes };
    }
    t -= Math.max(1, taille * 0.04);
  }
}

function rectArrondi(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rayon = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rayon, y);
  ctx.arcTo(x + w, y, x + w, y + h, rayon);
  ctx.arcTo(x + w, y + h, x, y + h, rayon);
  ctx.arcTo(x, y + h, x, y, rayon);
  ctx.arcTo(x, y, x + w, y, rayon);
  ctx.closePath();
}

/** Dessine l'image en remplissant la zone (recadrage centré). */
function couvrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, rayon = 0) {
  const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / ratio;
  const sh = h / ratio;
  ctx.save();
  if (rayon > 0) {
    rectArrondi(ctx, x, y, w, h, rayon);
    ctx.clip();
  }
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

function zonePhoto(ctx: CanvasRenderingContext2D, spec: Spec, x: number, y: number, w: number, h: number, rayon: number, fondVide: string) {
  if (spec.photo) {
    couvrir(ctx, spec.photo, x, y, w, h, rayon);
    return;
  }
  ctx.save();
  rectArrondi(ctx, x, y, w, h, rayon);
  ctx.fillStyle = fondVide;
  ctx.fill();
  ctx.fillStyle = texteSur(fondVide) === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(17,24,39,0.45)';
  ctx.font = police(600, Math.min(w, h) * 0.06);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ajoutez une photo du produit', x + w / 2, y + h / 2);
  ctx.restore();
}

// ---------- Blocs empilables ----------

interface Bloc {
  h: number;
  /** Espace au-dessus du bloc (ignoré pour le premier). */
  avant: number;
  dessiner: (x: number, y: number, largeur: number) => void;
}

function blocTexte(ctx: CanvasRenderingContext2D, texte: string, largeur: number, o: { taille: number; min: number; poids: number; lignesMax: number; couleur: string; interligne?: number; avant: number; centre?: boolean }): Bloc | null {
  if (!texte.trim()) return null;
  const { taille, lignes } = ajuster(ctx, texte.trim(), largeur, o.lignesMax, o.taille, o.min, o.poids);
  const hauteurLigne = taille * (o.interligne ?? 1.12);
  return {
    h: hauteurLigne * lignes.length,
    avant: o.avant,
    dessiner: (x, y, l) => {
      ctx.font = police(o.poids, taille);
      ctx.fillStyle = o.couleur;
      ctx.textBaseline = 'top';
      ctx.textAlign = o.centre ? 'center' : 'left';
      lignes.forEach((ligne, i) => ctx.fillText(ligne, o.centre ? x + l / 2 : x, y + i * hauteurLigne + (hauteurLigne - taille) / 2));
    },
  };
}

/** Prix (éventuellement dans une pastille) suivi de l'ancien prix barré. */
function blocPrix(ctx: CanvasRenderingContext2D, spec: Spec, largeur: number, o: { taille: number; couleur: string; pastille?: string; couleurAncien: string; avant: number; centre?: boolean }): Bloc | null {
  if (!spec.prix) return null;
  let taille = o.taille;
  const tailleAncien = () => taille * 0.56;
  const mesurer = () => {
    ctx.font = police(800, taille);
    const lp = ctx.measureText(spec.prix).width;
    ctx.font = police(600, tailleAncien());
    const la = spec.ancienPrix ? ctx.measureText(spec.ancienPrix).width : 0;
    const pad = o.pastille ? taille * 0.5 : 0;
    return { lp, la, pad, total: lp + pad * 2 + (la ? la + taille * 0.4 : 0) };
  };
  while (mesurer().total > largeur && taille > o.taille * 0.5) taille -= 2;
  const { lp, la, pad, total } = mesurer();
  const h = o.pastille ? taille * 1.7 : taille * 1.15;
  return {
    h,
    avant: o.avant,
    dessiner: (x, y, l) => {
      const depart = o.centre ? x + (l - total) / 2 : x;
      if (o.pastille) {
        rectArrondi(ctx, depart, y, lp + pad * 2, h, h / 2);
        ctx.fillStyle = o.pastille;
        ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = police(800, taille);
      ctx.fillStyle = o.pastille ? texteSur(o.pastille) : o.couleur;
      ctx.fillText(spec.prix, depart + pad, y + h / 2 + taille * 0.03);
      if (la) {
        const xa = depart + lp + pad * 2 + taille * 0.4;
        ctx.font = police(600, tailleAncien());
        ctx.fillStyle = o.couleurAncien;
        ctx.fillText(spec.ancienPrix, xa, y + h / 2 + taille * 0.03);
        ctx.fillRect(xa - 4, y + h / 2, la + 8, Math.max(2, taille * 0.05));
      }
    },
  };
}

const ligneContact = (spec: Spec) => [spec.cta.trim(), spec.contact.trim()].filter(Boolean).join('  ·  ');

function blocBouton(ctx: CanvasRenderingContext2D, spec: Spec, largeur: number, o: { taille: number; fond: string; avant: number }): Bloc | null {
  const texte = ligneContact(spec);
  if (!texte) return null;
  const { taille, lignes } = ajuster(ctx, texte, largeur - o.taille * 1.6, 1, o.taille, o.taille * 0.6, 700);
  const h = o.taille * 2.5;
  return {
    h,
    avant: o.avant,
    dessiner: (x, y, l) => {
      rectArrondi(ctx, x, y, l, h, h / 2);
      ctx.fillStyle = o.fond;
      ctx.fill();
      ctx.font = police(700, taille);
      ctx.fillStyle = texteSur(o.fond) === '#ffffff' ? '#ffffff' : spec.primaire;
      if (luminance(o.fond) > 0.45 && luminance(spec.primaire) > 0.45) ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lignes[0], x + l / 2, y + h / 2 + taille * 0.04);
    },
  };
}

function blocMarque(ctx: CanvasRenderingContext2D, spec: Spec, o: { hauteur: number; couleur: string; avant: number; centre?: boolean }): Bloc | null {
  if (spec.logo) {
    const logo = spec.logo;
    const ratio = Math.min(o.hauteur / logo.naturalHeight, (o.hauteur * 3.2) / logo.naturalWidth);
    const lw = logo.naturalWidth * ratio;
    const lh = logo.naturalHeight * ratio;
    return {
      h: o.hauteur,
      avant: o.avant,
      dessiner: (x, y, l) => ctx.drawImage(logo, o.centre ? x + (l - lw) / 2 : x, y + (o.hauteur - lh) / 2, lw, lh),
    };
  }
  if (!spec.marque.trim()) return null;
  const taille = o.hauteur * 0.46;
  return {
    h: o.hauteur,
    avant: o.avant,
    dessiner: (x, y, l) => {
      ctx.font = police(800, taille);
      ctx.fillStyle = o.couleur;
      ctx.textBaseline = 'middle';
      ctx.textAlign = o.centre ? 'center' : 'left';
      ctx.fillText(spec.marque.trim().toUpperCase(), o.centre ? x + l / 2 : x, y + o.hauteur / 2, l);
    },
  };
}

const hauteurPile = (blocs: Bloc[]) => blocs.reduce((total, b, i) => total + b.h + (i === 0 ? 0 : b.avant), 0);

function dessinerPile(blocs: Bloc[], x: number, y: number, largeur: number) {
  let curseur = y;
  blocs.forEach((b, i) => {
    if (i > 0) curseur += b.avant;
    b.dessiner(x, curseur, largeur);
    curseur += b.h;
  });
}

const presents = (blocs: (Bloc | null)[]) => blocs.filter((b): b is Bloc => b !== null);

function pastilleBadge(ctx: CanvasRenderingContext2D, spec: Spec, cx: number, cy: number, rayon: number) {
  const texte = spec.badge.trim();
  if (!texte) return;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = rayon * 0.25;
  ctx.shadowOffsetY = rayon * 0.08;
  ctx.beginPath();
  ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
  ctx.fillStyle = spec.secondaire;
  ctx.fill();
  ctx.restore();
  const { taille, lignes } = ajuster(ctx, texte, rayon * 1.5, 2, rayon * 0.62, rayon * 0.24, 800);
  ctx.font = police(800, taille);
  ctx.fillStyle = texteSur(spec.secondaire);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hl = taille * 1.05;
  lignes.forEach((l, i) => ctx.fillText(l, cx, cy + (i - (lignes.length - 1) / 2) * hl + taille * 0.04));
}

// ---------- Modèles ----------

function modeleAffiche(ctx: CanvasRenderingContext2D, f: Format, spec: Spec, s: number) {
  const { w, h } = f;
  const m = 64 * s;
  zonePhoto(ctx, spec, 0, 0, w, h, 0, spec.primaire);

  const haut = ctx.createLinearGradient(0, 0, 0, h * 0.28);
  haut.addColorStop(0, 'rgba(0,0,0,0.5)');
  haut.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haut;
  ctx.fillRect(0, 0, w, h * 0.28);

  const paysage = w / h > 1.3;
  const largeur = paysage ? w * 0.62 : w - m * 2;
  const blocs = presents([
    blocTexte(ctx, spec.accroche, largeur, { taille: 84 * s, min: 50 * s, poids: 800, lignesMax: 3, couleur: '#ffffff', interligne: 1.06, avant: 0 }),
    blocTexte(ctx, spec.sousTitre, largeur, { taille: 38 * s, min: 28 * s, poids: 500, lignesMax: 2, couleur: 'rgba(255,255,255,0.92)', interligne: 1.25, avant: 18 * s }),
    blocPrix(ctx, spec, largeur, { taille: 56 * s, couleur: '#ffffff', pastille: spec.primaire, couleurAncien: 'rgba(255,255,255,0.8)', avant: 30 * s }),
    blocTexte(ctx, ligneContact(spec), largeur, { taille: 32 * s, min: 22 * s, poids: 700, lignesMax: 1, couleur: '#ffffff', avant: 30 * s }),
  ]);
  const total = hauteurPile(blocs);
  const bas = f.id === 'story' ? h * 0.1 : m;
  const depart = h - bas - total;

  // Le voile sombre ne commence qu'un peu au-dessus du texte, pour laisser voir le produit.
  const debutVoile = Math.max(0, depart - h * 0.14);
  const degrade = ctx.createLinearGradient(0, debutVoile, 0, h);
  degrade.addColorStop(0, 'rgba(0,0,0,0)');
  degrade.addColorStop(0.35, 'rgba(0,0,0,0.55)');
  degrade.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, debutVoile, w, h);

  dessinerPile(blocs, m, depart, largeur);

  const hautSur = f.id === 'story' ? h * 0.08 : m;
  blocMarque(ctx, spec, { hauteur: 76 * s, couleur: '#ffffff', avant: 0 })?.dessiner(m, hautSur, w * 0.5);
  pastilleBadge(ctx, spec, w - m - 100 * s, hautSur + 100 * s, 100 * s);
}

function modelePromo(ctx: CanvasRenderingContext2D, f: Format, spec: Spec, s: number) {
  const { w, h } = f;
  const m = 64 * s;
  const fg = texteSur(spec.primaire);
  const doux = fg === '#ffffff' ? 'rgba(255,255,255,0.88)' : 'rgba(17,24,39,0.8)';

  ctx.fillStyle = spec.primaire;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = spec.secondaire;
  ctx.beginPath();
  ctx.arc(w, 0, Math.min(w, h) * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(-w * 0.08, h * 1.02, Math.min(w, h) * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const carte = (x: number, y: number, cw: number, ch: number) => {
    const r = 44 * s;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 50 * s;
    ctx.shadowOffsetY = 18 * s;
    rectArrondi(ctx, x, y, cw, ch, r);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    const b = 12 * s;
    zonePhoto(ctx, spec, x + b, y + b, cw - b * 2, ch - b * 2, r - b, '#e5e7eb');
    pastilleBadge(ctx, spec, x + cw - 70 * s, y + 60 * s, 104 * s);
  };

  if (w / h > 1.3) {
    const largeur = w * 0.46 - m;
    const blocs = presents([
      blocMarque(ctx, spec, { hauteur: 56 * s, couleur: fg, avant: 0 }),
      blocTexte(ctx, spec.accroche, largeur, { taille: 82 * s, min: 46 * s, poids: 800, lignesMax: 3, couleur: fg, interligne: 1.06, avant: 26 * s }),
      blocTexte(ctx, spec.sousTitre, largeur, { taille: 34 * s, min: 26 * s, poids: 500, lignesMax: 2, couleur: doux, interligne: 1.25, avant: 16 * s }),
      blocPrix(ctx, spec, largeur, { taille: 70 * s, couleur: fg, couleurAncien: doux, avant: 26 * s }),
      blocBouton(ctx, spec, largeur, { taille: 30 * s, fond: '#ffffff', avant: 28 * s }),
    ]);
    dessinerPile(blocs, m, (h - hauteurPile(blocs)) / 2, largeur);
    carte(w * 0.5, m, w * 0.5 - m, h - m * 2);
    return;
  }

  const largeur = w - m * 2;
  const hautSur = f.id === 'story' ? h * 0.08 : m;
  const basSur = f.id === 'story' ? h * 0.09 : m;
  const haut = presents([
    blocMarque(ctx, spec, { hauteur: 60 * s, couleur: fg, avant: 0 }),
    blocTexte(ctx, spec.accroche, largeur * 0.76, { taille: 90 * s, min: 50 * s, poids: 800, lignesMax: 3, couleur: fg, interligne: 1.06, avant: 26 * s }),
  ]);
  const bas = presents([
    blocPrix(ctx, spec, largeur, { taille: 84 * s, couleur: fg, couleurAncien: doux, avant: 0 }),
    blocTexte(ctx, spec.sousTitre, largeur, { taille: 36 * s, min: 28 * s, poids: 500, lignesMax: 2, couleur: doux, interligne: 1.25, avant: 12 * s }),
    blocBouton(ctx, spec, largeur, { taille: 34 * s, fond: '#ffffff', avant: 30 * s }),
  ]);
  const hHaut = hauteurPile(haut);
  const hBas = hauteurPile(bas);
  dessinerPile(haut, m, hautSur, largeur);
  dessinerPile(bas, m, h - basSur - hBas, largeur);
  const yCarte = hautSur + hHaut + 44 * s;
  carte(m, yCarte, largeur, h - basSur - hBas - 44 * s - yCarte);
}

function modeleEpure(ctx: CanvasRenderingContext2D, f: Format, spec: Spec, s: number) {
  const { w, h } = f;
  const m = 60 * s;
  const fond = '#F7F4EF';
  const encre = '#1c1917';
  const gris = '#57534e';
  const accent = luminance(spec.primaire) > 0.6 ? encre : spec.primaire;

  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, w, h);

  const textes = (largeur: number) =>
    presents([
      blocMarque(ctx, spec, { hauteur: 52 * s, couleur: accent, avant: 0 }),
      blocTexte(ctx, spec.accroche, largeur, { taille: 78 * s, min: 44 * s, poids: 800, lignesMax: 3, couleur: encre, interligne: 1.08, avant: 22 * s }),
      blocTexte(ctx, spec.sousTitre, largeur, { taille: 34 * s, min: 26 * s, poids: 500, lignesMax: 2, couleur: gris, interligne: 1.28, avant: 14 * s }),
      blocPrix(ctx, spec, largeur, { taille: 66 * s, couleur: accent, couleurAncien: '#78716c', avant: 24 * s }),
      blocTexte(ctx, ligneContact(spec), largeur, { taille: 30 * s, min: 22 * s, poids: 700, lignesMax: 1, couleur: encre, avant: 26 * s }),
    ]);

  const etiquette = (x: number, y: number) => {
    const texte = spec.badge.trim();
    if (!texte) return;
    ctx.font = police(800, 34 * s);
    const lt = Math.min(ctx.measureText(texte).width, w * 0.5);
    const eh = 76 * s;
    rectArrondi(ctx, x, y, lt + 56 * s, eh, eh / 2);
    ctx.fillStyle = spec.secondaire;
    ctx.fill();
    ctx.fillStyle = texteSur(spec.secondaire);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, x + 28 * s, y + eh / 2 + 2 * s, lt);
  };

  if (w / h > 1.3) {
    const lp = w * 0.48;
    zonePhoto(ctx, spec, m, m, lp - m, h - m * 2, 36 * s, '#e7e2d9');
    etiquette(m + 24 * s, m + 24 * s);
    const largeur = w - lp - m * 2;
    const blocs = textes(largeur);
    dessinerPile(blocs, lp + m, (h - hauteurPile(blocs)) / 2, largeur);
    return;
  }

  const largeur = w - m * 2;
  const blocs = textes(largeur);
  const total = hauteurPile(blocs);
  const basSur = f.id === 'story' ? h * 0.09 : m;
  const hautSur = f.id === 'story' ? h * 0.07 : m;
  const yTexte = h - basSur - total;
  zonePhoto(ctx, spec, m, hautSur, largeur, yTexte - 40 * s - hautSur, 40 * s, '#e7e2d9');
  etiquette(m + 28 * s, hautSur + 28 * s);
  dessinerPile(blocs, m, yTexte, largeur);
}

/** Construit la description d'un visuel à partir du produit, des textes et de la marque. */
export function construireSpec(o: {
  produit: Produit;
  textes: TextesCreation;
  modele: ModeleId;
  organisation: Organisation;
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}): Spec {
  const marque = o.organisation.marque ?? MARQUE_PAR_DEFAUT;
  const { produit, textes } = o;
  return {
    modele: o.modele,
    accroche: textes.accroche,
    sousTitre: textes.sousTitre,
    prix: textes.afficherPrix ? formatFCFA(produit.prixPromo ?? produit.prix) : '',
    ancienPrix: textes.afficherPrix && produit.prixPromo !== null ? formatFCFA(produit.prix) : '',
    badge: textes.badge,
    cta: textes.cta,
    contact: o.organisation.whatsapp,
    marque: o.organisation.nom,
    primaire: marque.couleurPrimaire,
    secondaire: marque.couleurSecondaire,
    photo: o.photo,
    logo: o.logo,
  };
}

/** Compose la création dans le canvas, aux dimensions exactes du format. */
export function dessiner(canvas: HTMLCanvasElement, format: Format, spec: Spec) {
  canvas.width = format.w;
  canvas.height = format.h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, format.w, format.h);
  // Échelle typographique : même impression de taille d'un format à l'autre.
  const s = Math.sqrt(format.w * format.h) / 1080;
  if (spec.modele === 'promo') modelePromo(ctx, format, spec, s);
  else if (spec.modele === 'epure') modeleEpure(ctx, format, spec, s);
  else modeleAffiche(ctx, format, spec, s);
}

/** Les polices doivent être chargées avant de dessiner, sinon le canvas utilise la police de secours. */
export async function policesPretes() {
  try {
    await Promise.all([500, 600, 700, 800].map((p) => document.fonts.load(`${p} 40px Inter`)));
  } catch {
    // Hors ligne : on dessine avec la police système.
  }
}

export function exporterPng(format: Format, spec: Spec): Promise<Blob> {
  const canvas = document.createElement('canvas');
  dessiner(canvas, format, spec);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export impossible.'))), 'image/png'));
}

export function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
