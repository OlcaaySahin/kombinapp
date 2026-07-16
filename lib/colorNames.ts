// Ürün hex renk kodunu Türkçe bir renk adına çevirir (görüntüleme/istatistik amaçlı).
// generate-outfit Edge Function'daki NAMED_COLORS/closestColorName ile aynı palet —
// Edge Function'lar client kodunu import edemediği için orada ayrı bir kopyası var.

const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'Beyaz', hex: '#F5F5F5' },
  { name: 'Siyah', hex: '#1C1C1E' },
  { name: 'Gri', hex: '#8E8E93' },
  { name: 'Bej', hex: '#D8C3A5' },
  { name: 'Kahverengi', hex: '#6B4226' },
  { name: 'Lacivert', hex: '#2C3E63' },
  { name: 'Mavi', hex: '#3461FD' },
  { name: 'Yeşil', hex: '#3FA34D' },
  { name: 'Sarı', hex: '#E8B923' },
  { name: 'Turuncu', hex: '#F2762E' },
  { name: 'Kırmızı', hex: '#E4463A' },
  { name: 'Pembe', hex: '#E88BA0' },
  { name: 'Mor', hex: '#8B3FE8' },
  { name: 'Bordo', hex: '#722F37' },
  { name: 'Haki', hex: '#7A7256' },
  { name: 'Altın', hex: '#D4AF37' },
  { name: 'Gümüş', hex: '#C0C0C0' },
  { name: 'Krem', hex: '#E8E0D0' },
];

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16),
  };
}

export function closestColorName(hex: string | null | undefined): string | null {
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
