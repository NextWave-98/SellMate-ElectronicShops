import { useAppThemeVariant } from '@/hooks/useAppThemeVariant'

/** Orange for organization admin; blue for branch. */
export function useCourierModalVariant(): 'orange' | 'blue' {
  return useAppThemeVariant()
}
