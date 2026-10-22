import { useLayoutEffect } from 'react'

const SURFACES = 'h1, div[class*="rounded-"][class*="bg-card"], section[class*="rounded-"][class*="bg-card"], article[class*="rounded-"][class*="bg-card"], div[class*="rounded-"][class~="bg-white/[0.04]"], .slark-panel'

// Animate existing page surfaces, including cards mounted after an async query.
export function useAppEntrance(root, route) {
  useLayoutEffect(() => {
    const element = root.current
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!element || preference.matches || !Element.prototype.animate) return
    const seen = new WeakSet()
    const animations = new Set()
    let frame
    let stopped = false
    function reveal() {
      if (stopped) return
      let index = 0
      for (const panel of element.querySelectorAll(SURFACES)) {
        if (seen.has(panel) || panel.closest('.slark-panel-skeleton')) continue
        seen.add(panel)
        // Nested panels share their parent's entrance, avoiding double movement.
        if (panel.parentElement?.closest(SURFACES)) continue
        const animation = panel.animate([
          { opacity:0, transform:'translateY(16px) scale(.99)' },
          { opacity:1, transform:'translateY(0) scale(1)' },
        ], { duration:520, delay:Math.min(index++,5)*55, easing:'cubic-bezier(.22,1,.36,1)', fill:'backwards' })
        animations.add(animation)
        animation.onfinish = animation.oncancel = () => animations.delete(animation)
      }
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(reveal) }
    function reduceMotion() {
      if (!preference.matches) return
      stopped = true
      cancelAnimationFrame(frame)
      for (const animation of animations) animation.cancel()
    }
    const observer = new MutationObserver(schedule)
    observer.observe(element, { childList:true, subtree:true })
    preference.addEventListener('change', reduceMotion)
    reveal()
    return () => {
      stopped = true
      observer.disconnect()
      preference.removeEventListener('change', reduceMotion)
      cancelAnimationFrame(frame)
      for (const animation of animations) animation.cancel()
    }
  }, [root, route])
}
