import { generateRandomOutfit } from '../outfitGenerator';

// CategorySlot'un bir alt kümesi — yapısal olarak uyumlu, import alias'ına bağımlı değil.
type TestSlot = 'ust_giyim' | 'alt_giyim' | 'ayakkabi' | 'taki';
type TestItem = { id: string; slot: TestSlot };

const FULL_INVENTORY: TestItem[] = [
  { id: 'top-1', slot: 'ust_giyim' },
  { id: 'bottom-1', slot: 'alt_giyim' },
  { id: 'shoes-1', slot: 'ayakkabi' },
  { id: 'jewelry-1', slot: 'taki' },
];

describe('generateRandomOutfit', () => {
  it('returns null when a required slot is missing', () => {
    const noShoes = FULL_INVENTORY.filter((item) => item.slot !== 'ayakkabi');
    expect(generateRandomOutfit(noShoes)).toBeNull();
  });

  it('returns null for an empty inventory', () => {
    expect(generateRandomOutfit<TestItem>([])).toBeNull();
  });

  it('returns one item per required slot when inventory is sufficient', () => {
    const result = generateRandomOutfit(FULL_INVENTORY);
    expect(result).not.toBeNull();
    const slots = result!.map((item) => item.slot).sort();
    expect(slots).toEqual(expect.arrayContaining(['ust_giyim', 'alt_giyim', 'ayakkabi']));
  });

  it('includes an accessory when one is available', () => {
    const result = generateRandomOutfit(FULL_INVENTORY);
    expect(result).toHaveLength(4);
    expect(result!.some((item) => item.slot === 'taki')).toBe(true);
  });

  it('omits the accessory slot when none are available', () => {
    const withoutAccessories = FULL_INVENTORY.filter((item) => item.slot !== 'taki');
    const result = generateRandomOutfit(withoutAccessories);
    expect(result).toHaveLength(3);
  });
});
