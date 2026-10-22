import { useEffect, type RefObject } from "react"

/** Scroll-linked motion stays scoped to the landing and is reverted on navigation. */
export function useSlarkMotion(scope: RefObject<HTMLDivElement>) {
  useEffect(() => {
    let active = true
    let dispose: (() => void) | undefined

    const initialize = async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText"),
      ])
      await document.fonts?.ready
      const root = scope.current
      if (!active || !root) return
      gsap.registerPlugin(ScrollTrigger, SplitText)
      const media = gsap.matchMedia()
      dispose = () => media.revert()
      media.add({ motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 768px)" }, context => {
        if (!context.conditions?.motion) return
        const desktop = Boolean(context.conditions.desktop)
        const splits: SplitText[] = []
        const query = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector))

        const entries = new Map<Element, () => void>()
        const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(records => {
          records.forEach(record => {
            if (!record.isIntersecting) return
            entries.get(record.target)?.()
            observer?.unobserve(record.target)
          })
        }, { rootMargin: "0px 0px -8% 0px" })

        query<HTMLElement>("[data-motion-title]").forEach(heading => {
          const accessibleLabel = heading.innerText.replace(/\s+/g, " ").trim()
          const split = SplitText.create(heading, { type: "words", aria: "auto", wordsClass: "slark-motion-word" })
          heading.setAttribute("aria-label", accessibleLabel)
          splits.push(split)
          if (!observer) return
          const reveal = gsap.from(split.words, {
            yPercent: 55, opacity: 0, duration: 0.95,
            ease: "power3.out", stagger: 0.045, paused: true,
          })
          entries.set(heading, () => { reveal.play() })
          observer.observe(heading)
        })

        query<HTMLElement>("[data-motion-reveal]").forEach(element => {
          if (!observer) return
          const reveal = gsap.from(element, {
            y: desktop ? 42 : 24, opacity: 0, duration: 0.9, ease: "power3.out", paused: true,
          })
          entries.set(element, () => { reveal.play() })
          observer.observe(element)
        })

        query<HTMLElement>("[data-motion-group]").forEach(group => {
          const children = Array.from(group.children)
          gsap.from(children, {
            y: (index: number) => desktop ? (index % 2 ? 105 : 65) : 35,
            opacity: 0.15, scale: 0.97, stagger: 0.12, ease: "none",
            scrollTrigger: { trigger: group, start: "top 94%", end: desktop ? "top 30%" : "top 45%", scrub: 0.7, invalidateOnRefresh: true },
          })
        })

        query<HTMLElement>("[data-motion-band]").forEach(band => {
          gsap.fromTo(band,
            { clipPath: `inset(0% ${desktop ? 4 : 1.5}% 0% ${desktop ? 4 : 1.5}% round ${desktop ? 60 : 24}px)` },
            { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
              scrollTrigger: { trigger: band, start: "top bottom", end: "top 30%", scrub: 0.6, invalidateOnRefresh: true } },
          )
        })

        const hero = root.querySelector<HTMLElement>(".slark-hero")
        const heroVisual = root.querySelector<HTMLElement>(".slark-hero-visual")
        if (hero && heroVisual) {
          gsap.from(heroVisual, { scale: 0.88, opacity: 0, duration: 1.3, ease: "power3.out" })
          gsap.to(heroVisual, { y: desktop ? -105 : -35, rotation: 4, ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8, invalidateOnRefresh: true } })
        }

        const quote = root.querySelector<HTMLElement>("blockquote")
        if (quote) {
          const split = SplitText.create(quote, { type: "words", aria: "auto" })
          splits.push(split)
          gsap.fromTo(split.words, { opacity: 0.2 }, { opacity: 1, stagger: 0.12, ease: "none",
            scrollTrigger: { trigger: quote, start: "top 86%", end: "bottom 52%", scrub: 0.5 } })
        }

        const cta = root.querySelector<HTMLElement>(".slark-cta-frame")
        if (cta) gsap.fromTo(cta,
          { clipPath: `inset(${desktop ? 12 : 4}% ${desktop ? 10 : 2}% round 75px)` },
          { clipPath: "inset(0% 0% round 32px)", ease: "none",
            scrollTrigger: { trigger: cta, start: "top 96%", end: "top 28%", scrub: 0.7 } })

        const footerBrand = root.querySelector<HTMLElement>("footer .slark-brand")
        if (footerBrand) gsap.from(footerBrand, { yPercent: 50, opacity: 0.2, ease: "none",
          scrollTrigger: { trigger: footerBrand, start: "top 95%", end: "top 75%", scrub: true } })

        ScrollTrigger.refresh()
        return () => { observer?.disconnect(); entries.clear(); splits.forEach(split => split.revert()) }
      }, root)
      dispose = () => media.revert()
    }

    // Content stays fully readable if a motion asset cannot load.
    initialize().catch(error => {
      dispose?.()
      console.warn("[Slark] Animações indisponíveis; conteúdo preservado.", error)
    })
    return () => { active = false; dispose?.() }
  }, [scope])
}
