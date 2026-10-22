import { useEffect, useState } from "react"
import { ShinyButton } from "./shiny-button"

const links = [
  { href: "/#ecossistema", label: "O ecossistema" },
  { href: "/#causa", label: "Nossa causa" },
  { href: "/#slark-live", label: "Slark Live" },
  { href: "/documentacao", label: "Documentação" },
  { href: "/#contato", label: "Contato" },
]

export function SlarkHeader({ documentation = false }: { documentation?: boolean }) {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 64
      setCompact(scrolled)
      if (scrolled) setOpen(false)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return <header data-compact={compact} className="slark-site-header pointer-events-none fixed inset-x-0 top-2 z-40 px-2 sm:top-3 sm:px-3" onKeyDown={event => { if (event.key === "Escape") setOpen(false) }}>
    <style>{`
      .slark-site-header{font-family:'Plus Jakarta Sans',sans-serif;color:#fff}
      .slark-site-header .slark-navbar{pointer-events:auto;background:linear-gradient(125deg,#ffffff13,#11112b52 55%,#ffffff09);backdrop-filter:blur(28px) saturate(1.6);-webkit-backdrop-filter:blur(28px) saturate(1.6);box-shadow:inset 0 1px 0 #ffffff22,0 12px 36px #00000020;border:1px solid #ffffff29;transition:max-width .25s ease,min-height .25s ease,padding .25s ease}
      .slark-site-header .header-logo{display:block;width:116px;height:auto;max-width:none}
      .slark-site-header .menu-link{color:#e8e6ffcc;transition:color .2s,background .2s}
      .slark-site-header .menu-link:hover,.slark-site-header .menu-link[aria-current]{color:#fff}
      .slark-site-header .mobile-glass{background:#0e0b40df;backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px)}
      .slark-site-header :is(a,button):focus-visible{outline:2px solid #99b1ff;outline-offset:4px}
      .slark-site-header[data-compact=true] .slark-navbar{max-width:380px;min-height:48px;padding:5px 8px 5px 18px}
      .slark-site-header[data-compact=true] :is(.header-section-label,.header-main-nav,.header-menu-toggle){display:none}
      .slark-site-header[data-compact=true] .header-actions{margin-left:auto}
      .slark-site-header[data-compact=true] .header-logo{width:88px}
      .slark-site-header[data-compact=true] .shiny-cta.shiny-cta-compact{min-height:36px;padding:10px 16px}
      @media(prefers-reduced-motion:reduce){.slark-site-header .slark-navbar{transition:none}}
      @media(max-width:639px){.slark-site-header[data-compact=true] .slark-navbar{max-width:320px}.slark-site-header[data-compact=true] .header-logo{width:67px}}
      @media(max-width:639px){.slark-site-header .header-logo{width:67px}}
    `}</style>
    <div className="slark-navbar relative mx-auto flex min-h-[60px] max-w-[1440px] items-center gap-2 rounded-full py-[7px] pl-4 pr-[7px] sm:gap-5 sm:pl-6">
      <a href="/" aria-label="Slark Educação, início" className="flex shrink-0 items-center gap-2 sm:gap-3"><img className="header-logo" src="/landing/logo.svg" width="116" height="24" alt="Slark" /><span className="header-section-label border-l border-[#FFFFFF]/20 pl-2 text-[9px] font-medium text-[#FFFFFF]/90 sm:pl-3 sm:text-xs">Educação</span></a>
      <nav aria-label="Menu principal" className="header-main-nav ml-auto hidden items-center gap-6 text-xs font-semibold lg:flex">{links.map(link => <a className="menu-link" key={link.href} href={link.href} aria-current={documentation && link.href === "/documentacao" ? "page" : undefined}>{link.label}</a>)}</nav>
      <div className="header-actions ml-auto flex items-center gap-1 lg:ml-0">
        <ShinyButton href="/login" compact>Entrar no app <span aria-hidden="true" className="hidden sm:inline">↗</span></ShinyButton>
        <button type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="slark-mobile-menu" onClick={() => setOpen(value => !value)} className="header-menu-toggle grid h-10 w-9 place-items-center rounded-full text-xl text-[#FFFFFF] hover:bg-[#FFFFFF]/10 sm:w-11 lg:hidden">{open ? "×" : "☰"}</button>
      </div>
      {open && <nav id="slark-mobile-menu" aria-label="Menu mobile" onClick={() => setOpen(false)} className="mobile-glass absolute inset-x-0 top-[calc(100%_+_8px)] flex flex-col gap-1 rounded-[26px] border border-[#FFFFFF]/15 p-4 text-sm font-medium shadow-2xl lg:hidden">{links.map(link => <a className="menu-link rounded-xl px-4 py-3 hover:bg-[#FFFFFF]/10" key={link.href} href={link.href} aria-current={documentation && link.href === "/documentacao" ? "page" : undefined}>{link.label}</a>)}</nav>}
    </div>
  </header>
}
