import type { CategorySlot } from '@/constants/categories';

export type Item = {
  id: string;
  name: string;
  slot: CategorySlot;
  color: string;
  colorName: string;
  season: string[];
};

export const MOCK_ITEMS: Item[] = [
  { id: '1', name: 'Beyaz Basic Tişört', slot: 'ust_giyim', color: '#F5F5F5', colorName: 'Beyaz', season: ['ilkbahar', 'yaz'] },
  { id: '2', name: 'Siyah Örme Kazak', slot: 'ust_giyim', color: '#1C1C1E', colorName: 'Siyah', season: ['sonbahar', 'kis'] },
  { id: '3', name: 'Mavi Kot Ceket', slot: 'dis_giyim', color: '#3461FD', colorName: 'Mavi', season: ['ilkbahar', 'sonbahar'] },
  { id: '4', name: 'Bej Trençkot', slot: 'dis_giyim', color: '#D8C3A5', colorName: 'Bej', season: ['sonbahar', 'kis'] },
  { id: '5', name: 'Lacivert Kot Pantolon', slot: 'alt_giyim', color: '#2C3E63', colorName: 'Lacivert', season: ['tum_mevsimler'] },
  { id: '6', name: 'Siyah Kumaş Pantolon', slot: 'alt_giyim', color: '#1C1C1E', colorName: 'Siyah', season: ['tum_mevsimler'] },
  { id: '7', name: 'Pembe Midi Etek', slot: 'alt_giyim', color: '#E88BA0', colorName: 'Pembe', season: ['ilkbahar', 'yaz'] },
  { id: '8', name: 'Sarı Yazlık Elbise', slot: 'tek_parca', color: '#E8B923', colorName: 'Sarı', season: ['yaz'] },
  { id: '9', name: 'Beyaz Spor Ayakkabı', slot: 'ayakkabi', color: '#F5F5F5', colorName: 'Beyaz', season: ['tum_mevsimler'] },
  { id: '10', name: 'Kahverengi Bot', slot: 'ayakkabi', color: '#6B4226', colorName: 'Kahverengi', season: ['sonbahar', 'kis'] },
  { id: '11', name: 'Siyah Topuklu', slot: 'ayakkabi', color: '#1C1C1E', colorName: 'Siyah', season: ['tum_mevsimler'] },
  { id: '12', name: 'Kahverengi Deri Çanta', slot: 'canta', color: '#6B4226', colorName: 'Kahverengi', season: ['tum_mevsimler'] },
  { id: '13', name: 'İnce Altın Kolye', slot: 'taki', color: '#E8B923', colorName: 'Altın', season: ['tum_mevsimler'] },
  { id: '14', name: 'Gümüş Halka Küpe', slot: 'taki', color: '#C7C9CC', colorName: 'Gümüş', season: ['tum_mevsimler'] },
  { id: '15', name: 'Kahverengi Güneş Gözlüğü', slot: 'tamamlayici', color: '#6B4226', colorName: 'Kahverengi', season: ['yaz'] },
  { id: '16', name: 'Mor Bere', slot: 'tamamlayici', color: '#8B3FE8', colorName: 'Mor', season: ['kis'] },
];

export type OutfitContext = {
  mevsim: string;
  mekan: string;
  saat: string;
  konsept: string;
};

export type GeneratedOutfit = {
  id: string;
  items: Item[];
  context: OutfitContext;
};

const DEFAULT_CONTEXT: OutfitContext = {
  mevsim: 'İlkbahar',
  mekan: 'Şehir içi',
  saat: 'Gündüz',
  konsept: 'Günlük',
};

function pickOne(items: Item[]): Item {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickRandomOutfit(context: OutfitContext = DEFAULT_CONTEXT): GeneratedOutfit {
  const bySlot = (slot: CategorySlot) => MOCK_ITEMS.filter((item) => item.slot === slot);

  const top = pickOne(bySlot('ust_giyim'));
  const bottom = pickOne(bySlot('alt_giyim'));
  const shoes = pickOne(bySlot('ayakkabi'));
  const extra = Math.random() > 0.5 ? pickOne(bySlot('taki')) : pickOne(bySlot('tamamlayici'));

  return {
    id: Math.random().toString(36).slice(2),
    items: [top, bottom, shoes, extra],
    context,
  };
}
