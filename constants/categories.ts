import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type CategorySlot =
  | 'ust_giyim'
  | 'alt_giyim'
  | 'tek_parca'
  | 'dis_giyim'
  | 'ayakkabi'
  | 'canta'
  | 'taki'
  | 'tamamlayici';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Category = {
  slot: CategorySlot;
  label: string;
  icon: IoniconName;
};

export const CATEGORIES: Category[] = [
  { slot: 'ust_giyim', label: 'Üst Giyim', icon: 'shirt-outline' },
  { slot: 'alt_giyim', label: 'Alt Giyim', icon: 'body-outline' },
  { slot: 'tek_parca', label: 'Elbise', icon: 'woman-outline' },
  { slot: 'dis_giyim', label: 'Dış Giyim', icon: 'umbrella-outline' },
  { slot: 'ayakkabi', label: 'Ayakkabı', icon: 'footsteps-outline' },
  { slot: 'canta', label: 'Çanta', icon: 'bag-handle-outline' },
  { slot: 'taki', label: 'Takı', icon: 'diamond-outline' },
  { slot: 'tamamlayici', label: 'Aksesuar', icon: 'glasses-outline' },
];

export function getCategory(slot: CategorySlot): Category {
  return CATEGORIES.find((category) => category.slot === slot)!;
}
