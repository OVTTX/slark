import { useSyncExternalStore } from 'react'
import { REDUCED_MOTION_QUERY, prefersSlarkReducedMotion } from '../../src/lib/motion'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
const serverSnapshot = () => false
export function useSlarkReducedMotion() {
  return useSyncExternalStore(subscribe, prefersSlarkReducedMotion, serverSnapshot)
}
