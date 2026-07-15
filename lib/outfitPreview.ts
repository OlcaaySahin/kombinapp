// Pollinations.ai: key/hesap gerektirmeyen ücretsiz görsel üretim servisi.
// Demo aşaması için tercih edildi (Gemini/OpenAI gibi ücretli alternatiflerin aksine).
// Not: resmi/kurumsal bir servis değil, üretim kalitesi/uptime garantisi yok — ileride
// gerçek try-on özelliğine geçilirse (kullanıcı foto yükleyip kendi halini görmesi)
// özel bir try-on API'sine geçilmesi gerekecek, bkz. CLAUDE.md "Fikir havuzu".

type PreviewItem = { id: string; name: string | null };

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
    .map((item) => item.name)
    .filter((name): name is string => Boolean(name))
    .join(', ');
  const prompt = `fashion illustration, full body human silhouette mannequin wearing ${pieces}, clean minimal fashion sketch style, plain light gray background, front view, no face details`;
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
