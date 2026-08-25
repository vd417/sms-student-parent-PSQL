import { colors } from './colors';
import { useBrand } from '@/providers/BrandProvider';

/** Subscribe to school brand updates and read the live `colors` tokens. */
export function useBrandColors() {
  useBrand();
  return colors;
}
