// Pollinations.ai: key/hesap gerektirmeyen ücretsiz görsel üretim servisi.
// Demo aşaması için tercih edildi (Gemini/OpenAI gibi ücretli alternatiflerin aksine).
// Not: resmi/kurumsal bir servis değil, üretim kalitesi/uptime garantisi yok. Ayrıca salt
// text-to-image olduğu için ürünlerin GERÇEK fotoğraflarını kullanamaz, sadece isim+renkten
// tahmin eder — gerçek fotoğraf tabanlı virtual try-on için özel bir modele (IDM-VTON vb.)
// geçilmesi gerekir, bkz. CLAUDE.md "Fikir havuzu".

type PreviewItem = { id: string; name: string | null; color?: string | null };

const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'white', hex: '#F5F5F5' },
  { name: 'black', hex: '#1C1C1E' },
  { name: 'gray', hex: '#8E8E93' },
  { name: 'beige', hex: '#D8C3A5' },
  { name: 'brown', hex: '#6B4226' },
  { name: 'navy blue', hex: '#2C3E63' },
  { name: 'blue', hex: '#3461FD' },
  { name: 'green', hex: '#3FA34D' },
  { name: 'yellow', hex: '#E8B923' },
  { name: 'orange', hex: '#F2762E' },
  { name: 'red', hex: '#E4463A' },
  { name: 'pink', hex: '#E88BA0' },
  { name: 'purple', hex: '#8B3FE8' },
  { name: 'burgundy', hex: '#722F37' },
  { name: 'khaki', hex: '#7A7256' },
  { name: 'gold', hex: '#D4AF37' },
  { name: 'silver', hex: '#C0C0C0' },
  { name: 'cream', hex: '#E8E0D0' },
];

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16),
  };
}

function closestColorName(hex: string | null | undefined): string | null {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return null;
  const target = hexToRgb(hex);
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const candidate of NAMED_COLORS) {
    const rgb = hexToRgb(candidate.hex);
    const dist = (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best.name;
}

function seedFromIds(ids: string[]): number {
  const joined = ids.join('|');
  let hash = 0;
  for (let i = 0; i < joined.length; i++) {
    hash = (hash * 31 + joined.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function buildOutfitPreviewUrl(items: PreviewItem[]): string {
  const pieces = items
    .filter((item) => item.name)
    .map((item) => {
      const colorName = closestColorName(item.color);
      return colorName ? `${colorName} ${item.name}` : item.name;
    })
    .join(', ');

  const prompt = `professional photorealistic fashion photography, full body studio photo of a plain faceless mannequin wearing: ${pieces}. Realistic fabric texture, soft studio lighting, plain neutral gray background, front view, high detail, DSLR photo`;
  const seed = seedFromIds(items.map((item) => item.id));

  const params = new URLSearchParams({
    width: '512',
    height: '768',
    seed: String(seed),
    nologo: 'true',
    model: 'flux',
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}
