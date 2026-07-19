// Paylaşım kartı şablonları (kullanıcı isteği 2026-07-19: "10 tasarım + seçici").
// Tek bir parametrik kart bileşeni (app/kombin-paylas.tsx) bu config'lere göre
// renk/dekorasyon/yerleşim değiştirir — 10 ayrı JSX ağacı yerine, gerçek görsel
// çeşitlilik + paylaşılan capture/paylaşım mantığı. Yeni native bağımlılık YOK
// (gradient yerine mevcut "blob" deseninde olduğu gibi katmanlı yarı-saydam şekiller).

export type ShareLayout = 'grid' | 'hero' | 'polaroid' | 'strip' | 'instagram';
export type ShareDecoration = 'blobs' | 'stars' | 'corners' | 'sprockets' | 'none';

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
  itemBg: string;
  itemBorderColor: string;
  decoration: ShareDecoration;
  decorationColors: [string, string];
  layout: ShareLayout;
  frame?: { color: string; width: number; inset: number };
};

export const SHARE_TEMPLATES: ShareTemplateConfig[] = [
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
    id: 'minimal-beyaz',
    label: 'Minimal',
    swatch: ['#FFFFFF', '#111111', '#E5E7EB'],
    background: '#FFFFFF',
    textColor: '#111111',
    mutedTextColor: '#6B7280',
    chipBg: 'transparent',
    chipTextColor: '#111111',
    itemBg: '#F3F4F6',
    itemBorderColor: '#E5E7EB',
    decoration: 'none',
    decorationColors: ['#111111', '#111111'],
    layout: 'grid',
    frame: { color: '#111111', width: 1, inset: 10 },
  },
  {
    id: 'siyah-luks',
    label: 'Siyah & Altın',
    swatch: ['#0B0B0C', '#E8B923', '#E8B923'],
    background: '#0B0B0C',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(232,185,35,0.8)',
    chipBg: 'rgba(232,185,35,0.12)',
    chipTextColor: '#E8B923',
    itemBg: 'rgba(232,185,35,0.06)',
    itemBorderColor: 'rgba(232,185,35,0.35)',
    decoration: 'corners',
    decorationColors: ['#E8B923', '#E8B923'],
    layout: 'grid',
    frame: { color: '#E8B923', width: 1, inset: 14 },
  },
  {
    id: 'gunbatimi',
    label: 'Gün Batımı',
    swatch: ['#7A2E3A', '#FF9F43', '#FF4757'],
    background: '#7A2E3A',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(255,255,255,0.75)',
    chipBg: 'rgba(255,255,255,0.18)',
    chipTextColor: '#FFFFFF',
    itemBg: 'rgba(255,255,255,0.12)',
    itemBorderColor: 'rgba(255,255,255,0.15)',
    decoration: 'blobs',
    decorationColors: ['#FF9F43', '#FF4757'],
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
    id: 'pastel-krem',
    label: 'Pastel Krem',
    swatch: ['#F6EEE2', '#E8B923', '#3A2E22'],
    background: '#F6EEE2',
    textColor: '#3A2E22',
    mutedTextColor: '#8A7A66',
    chipBg: '#FFFFFF',
    chipTextColor: '#3A2E22',
    itemBg: '#FFFFFF',
    itemBorderColor: '#EBDFCC',
    decoration: 'none',
    decorationColors: ['#E8B923', '#E8B923'],
    layout: 'grid',
  },
  {
    id: 'dergi',
    label: 'Dergi Kapağı',
    swatch: ['#FFFFFF', '#111111', '#111111'],
    background: '#FFFFFF',
    textColor: '#111111',
    mutedTextColor: '#6B7280',
    chipBg: '#111111',
    chipTextColor: '#FFFFFF',
    itemBg: '#F3F4F6',
    itemBorderColor: '#E5E7EB',
    decoration: 'none',
    decorationColors: ['#111111', '#111111'],
    layout: 'hero',
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    swatch: ['#FFFFFF', '#DDDDDD', '#222222'],
    background: '#FFFFFF',
    textColor: '#222222',
    mutedTextColor: '#777777',
    chipBg: '#F3F4F6',
    chipTextColor: '#222222',
    itemBg: '#EEEEEE',
    itemBorderColor: '#DDDDDD',
    decoration: 'none',
    decorationColors: ['#000000', '#000000'],
    layout: 'polaroid',
  },
  {
    id: 'retro-serit',
    label: 'Retro Şerit',
    swatch: ['#141414', '#FFFFFF', '#333333'],
    background: '#141414',
    textColor: '#FFFFFF',
    mutedTextColor: 'rgba(255,255,255,0.6)',
    chipBg: 'rgba(255,255,255,0.1)',
    chipTextColor: '#FFFFFF',
    itemBg: '#1F1F1F',
    itemBorderColor: '#333333',
    decoration: 'sprockets',
    decorationColors: ['#FFFFFF', '#FFFFFF'],
    layout: 'strip',
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
];

export const SHARE_TEMPLATE_PREF_KEY = 'kombin_share_template';
export const DEFAULT_SHARE_TEMPLATE_ID = SHARE_TEMPLATES[0].id;

export function getShareTemplate(id: string | null): ShareTemplateConfig {
  return SHARE_TEMPLATES.find((template) => template.id === id) ?? SHARE_TEMPLATES[0];
}
