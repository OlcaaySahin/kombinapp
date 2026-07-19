// Paylaşım kartı şablonları (kullanıcı isteği 2026-07-19: "10 tasarım + seçici",
// 2026-07-19 devamı: kullanıcı 3'ünü (Lacivert/Mor Gece/Instagram) beğendi, 7'sini
// beğenmedi — Gemini'den alınan 7 yeni tasarım fikri + Claude'un tasarladığı 5 yeni
// fikirle toplam 15 şablona çıkarıldı). Tek bir parametrik kart bileşeni
// (components/ui/ShareCardView.tsx) bu config'lere göre renk/dekorasyon/yerleşim
// değiştirir. Yeni native bağımlılık YOK (gradient yerine katmanlı yarı-saydam
// şekiller kullanılıyor).

export type ShareLayout = 'grid' | 'hero' | 'polaroid' | 'strip' | 'instagram';
export type ShareDecoration =
  | 'blobs'
  | 'stars'
  | 'corners'
  | 'sprockets'
  | 'none'
  | 'hollow-shapes'
  | 'thin-lines'
  | 'diamond-mix'
  | 'retro-mix'
  | 'torn-paper'
  | 'blueprint-grid'
  | 'spotlight'
  | 'glow-ring'
  | 'dashed-frame'
  | 'unboxing';
export type ShareChipStyle = 'pill' | 'outline' | 'dotted';

export type ShareTemplateConfig = {
  id: string;
  label: string;
  /** Seçici önizlemesi için: [zemin, dekorasyon1, dekorasyon2]. */
  swatch: [string, string, string];
  background: string;
  textColor: string;
  mutedTextColor: string;
  chipBg: string;
  chipTextColor: string;
  /** Varsayılan 'pill' (dolu, tam yuvarlak). */
  chipStyle?: ShareChipStyle;
  itemBg: string;
  itemBorderColor: string;
  /** Varsayılan 1. */
  itemBorderWidth?: number;
  decoration: ShareDecoration;
  decorationColors: [string, string];
  layout: ShareLayout;
  frame?: { color: string; width: number; inset: number };
  /** İlk ürün karesine abartılı köşe yuvarlaklığı (Retro Geometri). */
  quirkyFirstCorner?: boolean;
  /** Kombindeki ürünlerin gerçek renklerinden küçük bir "renk paleti" şeridi (Kumaş Numunesi). */
  showPaletteDots?: boolean;
};

export const SHARE_TEMPLATES: ShareTemplateConfig[] = [
  // ---------- Kullanıcının beğendiği 3 (değişmedi) ----------
  {
    id: 'lacivert-blob',
    label: 'Lacivert',
    swatch: ['#1B2A5E', '#3461FD', '#8B3FE8'],
    background: '#1B2A5E',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(255,255,255,0.7)',
    chipBg: 'rgba(255,255,255,0.15)',
    chipTextColor: '#FFFFFF',
    itemBg: 'rgba(255,255,255,0.1)',
    itemBorderColor: 'rgba(255,255,255,0.1)',
    decoration: 'blobs',
    decorationColors: ['#3461FD', '#8B3FE8'],
    layout: 'grid',
  },
  {
    id: 'mor-gece',
    label: 'Mor Gece',
    swatch: ['#241645', '#8B3FE8', '#FFFFFF'],
    background: '#241645',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(255,255,255,0.65)',
    chipBg: 'rgba(255,255,255,0.12)',
    chipTextColor: '#FFFFFF',
    itemBg: 'rgba(255,255,255,0.08)',
    itemBorderColor: 'rgba(255,255,255,0.12)',
    decoration: 'stars',
    decorationColors: ['#FFFFFF', '#8B3FE8'],
    layout: 'grid',
  },
  {
    id: 'instagram-grid',
    label: 'Instagram',
    swatch: ['#FFFFFF', '#3461FD', '#8E8E8E'],
    background: '#FFFFFF',
    textColor: '#111111',
    mutedTextColor: '#8E8E8E',
    chipBg: '#FAFAFA',
    chipTextColor: '#3461FD',
    itemBg: '#FAFAFA',
    itemBorderColor: '#EFEFEF',
    decoration: 'none',
    decorationColors: ['#000000', '#000000'],
    layout: 'instagram',
  },

  // ---------- Gemini'den alınan 7 yeni yön ----------
  {
    id: 'pazartesi-sabahi',
    label: 'Pazartesi Sabahı',
    swatch: ['#F7F7F7', '#3461FD', '#E8B923'],
    background: '#F7F7F7',
    textColor: '#1F2430',
    mutedTextColor: '#6B7280',
    chipBg: 'transparent',
    chipTextColor: '#E8B923',
    chipStyle: 'outline',
    itemBg: '#FFFFFF',
    itemBorderColor: '#E3E3E3',
    decoration: 'hollow-shapes',
    decorationColors: ['#3461FD', '#3461FD'],
    layout: 'grid',
  },
  {
    id: 'sehirli-safari',
    label: 'Şehirli Safari',
    swatch: ['#EAE7DC', '#E8B923', '#A1A59A'],
    background: '#EAE7DC',
    textColor: '#3A3226',
    mutedTextColor: '#7A7256',
    chipBg: 'rgba(232,185,35,0.25)',
    chipTextColor: '#3A3226',
    chipStyle: 'pill',
    itemBg: '#FFFFFF',
    itemBorderColor: '#D9D3C0',
    decoration: 'thin-lines',
    decorationColors: ['#A1A59A', '#FF4757'],
    layout: 'grid',
  },
  {
    id: 'dijital-sanatci',
    label: 'Dijital Sanatçı',
    swatch: ['#8B3FE8', '#FF4757', '#E8B923'],
    background: '#8B3FE8',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(255,255,255,0.75)',
    chipBg: 'rgba(255,255,255,0.15)',
    chipTextColor: '#FFFFFF',
    chipStyle: 'pill',
    itemBg: 'rgba(255,255,255,0.08)',
    itemBorderColor: '#FF4757',
    itemBorderWidth: 2,
    decoration: 'diamond-mix',
    decorationColors: ['#FF4757', '#E8B923'],
    layout: 'grid',
  },
  {
    id: 'retro-geometri',
    label: 'Retro Geometri',
    swatch: ['#FFFFFF', '#E8B923', '#8B3FE8'],
    background: '#FFFFFF',
    textColor: '#111111',
    mutedTextColor: '#6B7280',
    chipBg: 'rgba(52,97,253,0.15)',
    chipTextColor: '#3461FD',
    chipStyle: 'pill',
    itemBg: '#F3F4F6',
    itemBorderColor: '#E5E7EB',
    decoration: 'retro-mix',
    decorationColors: ['#E8B923', '#8B3FE8'],
    layout: 'grid',
    quirkyFirstCorner: true,
  },
  {
    id: 'dergi-kolaji',
    label: 'Dergi Kolajı',
    swatch: ['#F0F0F0', '#8B3FE8', '#3461FD'],
    background: '#F0F0F0',
    textColor: '#3461FD',
    mutedTextColor: '#6B7280',
    chipBg: 'transparent',
    chipTextColor: '#3461FD',
    chipStyle: 'dotted',
    itemBg: '#FFFFFF',
    itemBorderColor: '#E5E7EB',
    decoration: 'torn-paper',
    decorationColors: ['#8B3FE8', '#3461FD'],
    layout: 'grid',
  },
  {
    id: 'uzay-yolculugu',
    label: 'Uzay Yolculuğu',
    swatch: ['#101015', '#3461FD', '#A1A59A'],
    background: '#101015',
    textColor: '#FFFFFF',
    mutedTextColor: '#A1A59A',
    chipBg: 'rgba(161,165,154,0.1)',
    chipTextColor: '#A1A59A',
    chipStyle: 'outline',
    itemBg: 'rgba(52,97,253,0.05)',
    itemBorderColor: 'rgba(52,97,253,0.35)',
    decoration: 'blueprint-grid',
    decorationColors: ['#3461FD', '#3461FD'],
    layout: 'grid',
  },
  {
    id: 'gunesli-brunch',
    label: 'Güneşli Brunch',
    swatch: ['#FFFBEB', '#E8B923', '#FF4757'],
    background: '#FFFBEB',
    textColor: '#5C4813',
    mutedTextColor: '#8A7A52',
    chipBg: '#FF4757',
    chipTextColor: '#FFFFFF',
    chipStyle: 'pill',
    itemBg: '#FFFFFF',
    itemBorderColor: '#FFFFFF',
    itemBorderWidth: 2,
    decoration: 'hollow-shapes',
    decorationColors: ['#E8B923', '#E8B923'],
    layout: 'grid',
  },

  // ---------- 5 yeni yön (ürüne özgü, Claude tasarımı) ----------
  {
    id: 'vitrin',
    label: 'Vitrin',
    swatch: ['#1A1610', '#E8B923', '#E8B923'],
    background: '#1A1610',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(232,185,35,0.75)',
    chipBg: 'rgba(232,185,35,0.12)',
    chipTextColor: '#E8B923',
    chipStyle: 'pill',
    itemBg: 'rgba(232,185,35,0.06)',
    itemBorderColor: 'rgba(232,185,35,0.4)',
    decoration: 'spotlight',
    decorationColors: ['#E8B923', '#E8B923'],
    layout: 'grid',
    frame: { color: '#E8B923', width: 1, inset: 16 },
  },
  {
    id: 'kumas-numunesi',
    label: 'Kumaş Numunesi',
    swatch: ['#EFE7DA', '#8A7A66', '#D8C9B0'],
    background: '#EFE7DA',
    textColor: '#3A2E22',
    mutedTextColor: '#8A7A66',
    chipBg: '#FFFFFF',
    chipTextColor: '#3A2E22',
    chipStyle: 'dotted',
    itemBg: '#FFFFFF',
    itemBorderColor: '#D8C9B0',
    decoration: 'dashed-frame',
    decorationColors: ['#8A7A66', '#8A7A66'],
    layout: 'grid',
    showPaletteDots: true,
  },
  {
    id: 'gece-kulubu-neon',
    label: 'Gece Kulübü Neon',
    swatch: ['#000000', '#3461FD', '#FF4757'],
    background: '#000000',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(255,255,255,0.7)',
    chipBg: 'rgba(255,71,87,0.15)',
    chipTextColor: '#FF4757',
    chipStyle: 'pill',
    itemBg: 'rgba(52,97,253,0.08)',
    itemBorderColor: '#3461FD',
    itemBorderWidth: 2,
    decoration: 'glow-ring',
    decorationColors: ['#3461FD', '#FF4757'],
    layout: 'grid',
  },
  {
    id: 'kutu-acilisi',
    label: 'Kutu Açılışı',
    swatch: ['#FFFFFF', '#3461FD', '#E5E7EB'],
    background: '#FFFFFF',
    textColor: '#111111',
    mutedTextColor: '#6B7280',
    chipBg: '#F3F4F6',
    chipTextColor: '#111111',
    chipStyle: 'pill',
    itemBg: '#FAFAFA',
    itemBorderColor: '#EFEFEF',
    decoration: 'unboxing',
    decorationColors: ['#3461FD', '#3461FD'],
    layout: 'hero',
  },
  {
    id: 'terzi-defteri',
    label: 'Terzi Defteri',
    swatch: ['#FAFAF7', '#C9C9C4', '#3461FD'],
    background: '#FAFAF7',
    textColor: '#2B2B2E',
    mutedTextColor: '#8A8A8E',
    chipBg: 'transparent',
    chipTextColor: '#3461FD',
    chipStyle: 'outline',
    itemBg: '#FFFFFF',
    itemBorderColor: '#D6D6D2',
    decoration: 'blueprint-grid',
    decorationColors: ['#C9C9C4', '#3461FD'],
    layout: 'strip',
  },
];

export const SHARE_TEMPLATE_PREF_KEY = 'kombin_share_template';
export const DEFAULT_SHARE_TEMPLATE_ID = SHARE_TEMPLATES[0].id;

export function getShareTemplate(id: string | null): ShareTemplateConfig {
  return SHARE_TEMPLATES.find((template) => template.id === id) ?? SHARE_TEMPLATES[0];
}
