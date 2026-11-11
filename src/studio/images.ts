// Préparation des images dans le navigateur : on réduit avant d'enregistrer,
// pour rester léger sur les connexions mobiles et sous la limite d'un document Firestore.

const LIMITE_OCTETS = 850_000;

function charger(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible.'));
    img.src = src;
  });
}

export const chargerImage = charger;

function lire(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Fichier illisible.'));
    reader.readAsDataURL(file);
  });
}

function redimensionner(img: HTMLImageElement, coteMax: number, type: 'image/jpeg' | 'image/png', qualite: number) {
  const ratio = Math.min(1, coteMax / Math.max(img.naturalWidth, img.naturalHeight));
  const largeur = Math.max(1, Math.round(img.naturalWidth * ratio));
  const hauteur = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext('2d')!;
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largeur, hauteur);
  }
  ctx.drawImage(img, 0, 0, largeur, hauteur);
  return { dataUrl: canvas.toDataURL(type, qualite), largeur, hauteur };
}

/** Photo de produit : JPEG de 1400 px au plus, plus une miniature pour les listes. */
export async function preparerPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez un fichier image (JPG ou PNG).');
  const img = await charger(await lire(file));
  let cote = 1400;
  let qualite = 0.84;
  let photo = redimensionner(img, cote, 'image/jpeg', qualite);
  while (photo.dataUrl.length > LIMITE_OCTETS && cote > 600) {
    cote -= 200;
    qualite -= 0.04;
    photo = redimensionner(img, cote, 'image/jpeg', qualite);
  }
  const vignette = redimensionner(img, 200, 'image/jpeg', 0.7).dataUrl;
  return { ...photo, vignette };
}

/** Logo : PNG (transparence conservée) de 320 px au plus. */
export async function preparerLogo(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez un fichier image (PNG de préférence).');
  const img = await charger(await lire(file));
  const logo = redimensionner(img, 320, 'image/png', 1);
  if (logo.dataUrl.length > 200_000) throw new Error('Ce logo est trop lourd. Utilisez une image plus simple.');
  return logo.dataUrl;
}
