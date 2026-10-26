// Full motion on notebook/desktop layouts; smaller screens keep the OS preference.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce) and (max-width: 767px)'
export const FULL_MOTION_QUERY = '(min-width: 768px), (prefers-reduced-motion: no-preference)'

export function prefersSlarkReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}
