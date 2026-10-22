"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { SlarkHeader } from "./ui/slark-header"
import { useSlarkMotion } from "./hooks/use-slark-motion"
import GlassFolder, { type ArtPreset, type FolderFile } from "./ui/glass-folder-cards"

type Pillar = {
  id: string
  audience: string
  label: string
  meta: string
  art: ArtPreset
  description: string
  files: FolderFile[]
  details: string[]
}

const WHATSAPP = "https://wa.me/5511945699915?text=Ol%C3%A1!%20Quero%20conhecer%20a%20Slark%20para%20minha%20escola."
const PISA_SOURCE = "https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/brazil_61690648-en.html"

const PILLARS: Pillar[] = [
  {
    id: "app", audience: "PARA ALUNOS", label: "App Slark", meta: "Mapeamento & Gamificação", art: "aurora",
    description: "Seu jeito de aprender encontra espaço para crescer.",
    files: [
      { name: "Mapeamento de Características", meta: "IA & Perfil do Aluno" },
      { name: "Times Complementares", meta: "Squads de Trabalho" },
      { name: "Sistema de Selos", meta: "A cada 50 pontos" },
    ],
    details: [
      "Com apoio de IA, a Slark mapeia características no contexto da aprendizagem: Observador, Detalhista, Criativo e Raciocínio Lógico. Esse mapa pode evoluir com o estudante; não é um diagnóstico de personalidade.",
      "Times de 3 a 4 estudantes reúnem características que se complementam. Cada pessoa contribui com seu ponto de vista e aprende com os colegas.",
      "Pontos e Selos reconhecem o progresso ao longo da jornada. A proposta prevê um novo Selo a cada 50 pontos conquistados.",
    ],
  },
  {
    id: "aula", audience: "PARA EDUCADORES", label: "Aula Slark", meta: "Suporte Docente por IA", art: "glacier",
    description: "Mais contexto para ensinar. Mais tempo para conectar.",
    files: [
      { name: "Termômetro de Engajamento", meta: "Tempo Real" },
      { name: "Diário de Aula Automático", meta: "Gerado com IA" },
      { name: "Rede de Práticas Docentes", meta: "Troca entre Pares" },
    ],
    details: [
      "O Termômetro de Engajamento faz parte da proposta de acompanhamento da turma durante a aula, dando ao professor mais contexto para ajustar a dinâmica.",
      "O diário apoiado por IA organiza registros da aula para revisão do professor. A tecnologia ajuda a documentar; a interpretação pedagógica continua com o educador.",
      "A rede de práticas docentes propõe um espaço de troca de experiências entre professores, ampliando o repertório de estratégias para diferentes turmas.",
    ],
  },
  {
    id: "runaway", audience: "MATERIAL DIDÁTICO", label: "Ecossistema Runaway", meta: "Apostilas & Metodologia", art: "dusk",
    description: "Conteúdo que abre caminhos dentro e fora da sala.",
    files: [
      { name: "Apostilas Integradas com IA", meta: "Material Físico + Digital" },
      { name: "Mapas Mentais", meta: "Final de cada Capítulo" },
      { name: "Quizzes com Slark Live", meta: "Aprendizado Ativo" },
    ],
    details: [
      "O Runaway conecta material didático físico e digital à proposta de personalização da Slark, oferecendo apoio ao estudo e à exploração dos conteúdos.",
      "Mapas mentais ao final dos capítulos organizam os principais conceitos para apoiar a revisão e conectar ideias.",
      "Os quizzes com Slark Live conectam a turma a desafios em equipe, ao vivo. Os estudantes entram com o PIN compartilhado para participar da dinâmica.",
    ],
  },
  {
    id: "gestao", audience: "PARA GESTORES", label: "Dashboard Gestão", meta: "Métricas & Decisão", art: "ember",
    description: "Uma visão da turma que começa em cada estudante.",
    files: [
      { name: "Mapa de Competências", meta: "Visão por Turma" },
      { name: "Perfis e Características", meta: "Análise Consolidada" },
      { name: "Relatórios de Evolução", meta: "Decisão Orientada a Dados" },
    ],
    details: [
      "O mapa reúne informações de competências para apoiar a leitura da turma e o planejamento pedagógico da escola.",
      "A visão consolidada aproxima a gestão das características dos estudantes. Os dados precisam ser interpretados no contexto da turma, sem transformar pessoas em rótulos.",
      "O acompanhamento da evolução ajuda a equipe pedagógica a identificar necessidades e orientar decisões. A análise de dados apoia o julgamento de educadores e gestores.",
    ],
  },
]

const CHARACTERISTICS = [
  { name: "Observador", color: "#2E5BFF", symbol: "◎", text: "Enxerga conexões." },
  { name: "Detalhista", color: "#F5C451", symbol: "⌖", text: "Cuida de cada etapa." },
  { name: "Criativo", color: "#C44DFF", symbol: "✳", text: "Imagina possibilidades." },
  { name: "Raciocínio Lógico", color: "#3FD08A", symbol: "⌘", text: "Estrutura caminhos." },
]

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>
}

function Brand() {
  return <img className="slark-brand" src="/landing/logo.svg" width="116" height="24" alt="Slark Educação" />
}

function FolderCard({ pillar, index, onSelect }: {
  pillar: Pillar
  index: number
  onSelect: (pillar: Pillar, index: number) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const element = container.current
    if (!element || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      // Reserve horizontal space for the fan of open sheets on narrow screens.
      setWidth(Math.max(180, Math.min(340, entry.contentRect.width - 48)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <article className="relative min-w-0 rounded-[28px] border border-[#E8E6FF]/10 bg-[#0E0B40]/40 px-3 pb-7 pt-4 transition-colors hover:border-[#E8E6FF]/25 sm:px-6">
      <div className="flex items-center justify-between px-4 pt-3 text-[9px] tracking-[0.16em] text-[#E8E6FF]/45">
        <span>{pillar.audience}</span><span>0{index + 1}</span>
      </div>
      <div ref={container} className="flex min-h-[290px] items-center justify-center py-6 sm:min-h-[355px]">
        <GlassFolder
          label={pillar.label} meta={pillar.meta} art={pillar.art} tone="dark"
          seed={index * 7 + 3} files={pillar.files} action="none" width={width}
          open={open} onOpenChange={setOpen} onFileSelect={(_, fileIndex) => onSelect(pillar, fileIndex)}
          appearDelay={index * 80} className="slark-glass-folder"
        />
      </div>
      <div className="relative z-10 px-4">
        <h3 className="text-xl font-semibold tracking-tight text-[#E8E6FF]">{pillar.label}</h3>
        <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-[#E8E6FF]/55">{pillar.description}</p>
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
          className="mt-5 inline-flex items-center gap-3 rounded-full border border-[#E8E6FF]/15 px-4 py-2 text-xs text-[#E8E6FF]/85 transition hover:bg-[#E8E6FF]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8BA5FF]">
          {open ? "Fechar pasta" : "Explorar pasta"}<span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>
    </article>
  )
}

export default function SlarkLanding() {
  const [selected, setSelected] = useState<{ pillar: Pillar; index: number } | null>(null)
  const [liveAnswer, setLiveAnswer] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const scope = useRef<HTMLDivElement>(null)
  useSlarkMotion(scope)

  useEffect(() => {
    const originalTitle = document.title
    document.title = "Slark Educação"
    return () => { document.title = originalTitle }
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!selected || !element) return
    if (!element.open) element.showModal()
    return () => { if (element.open) element.close() }
  }, [selected])

  const showFile = (pillar: Pillar, index: number) => setSelected({ pillar, index })

  return (
    <div ref={scope} className="slark-marketing min-h-screen overflow-x-clip bg-[#05031F] text-[#E8E6FF]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
        html:has(.slark-marketing){scroll-behavior:smooth;scroll-padding-top:100px}
        .slark-marketing{font-family:'Plus Jakarta Sans',sans-serif;color-scheme:dark;--slark-blue:#2E5BFF}
        .slark-marketing .editorial{font-family:inherit;font-style:italic;font-weight:700}
        .slark-marketing .micro{font-family:inherit;font-weight:600;font-size:9px;letter-spacing:.12em}
        .slark-marketing .slark-brand{display:block;width:116px;height:auto;max-width:none}
        .slark-marketing section[id]{scroll-margin-top:100px}
        .slark-marketing .slark-glass-folder{font-family:'Plus Jakarta Sans',sans-serif}
        .slark-marketing .gf-meta{font-family:inherit;font-size:11px}
        .slark-marketing .slark-motion-word{will-change:transform;vertical-align:baseline}
        @media(max-width:767px){.slark-marketing .slark-brand{width:99px}.slark-marketing .slark-navbar .slark-brand{width:80px}}
        .slark-marketing .gf-title{max-width:230px;font-size:17px}
        .slark-marketing .gf-label{max-width:240px}
        .slark-marketing .gf-meta{font-family:inherit;font-size:11px}
        .slark-marketing .gf-sheet-head{flex-direction:column;align-items:flex-start;gap:3px;white-space:normal}
        .slark-marketing .gf-sheet-name{width:100%;white-space:nowrap;line-height:1.25}
        .slark-marketing .gf-sheet-meta{font-family:inherit;font-size:10px}
        .slark-marketing .gf-lines{top:53px}
        .slark-marketing .slark-glass-folder canvas{pointer-events:none}
        .slark-marketing .cta-primary{background:#2E5BFF;color:#FFFFFF;box-shadow:0 8px 30px #0033ff30}
        .slark-marketing .cta-primary:hover{background:#416AFF}
        .slark-marketing .slark-hero-title{font-size:clamp(1.85rem,7.15vw,6.1rem)}
        @media(max-width:639px){.slark-marketing .slark-hero-title{font-size:clamp(1.85rem,9.3vw,3.7rem)}}
        .slark-marketing .hero-orbit{position:absolute;border:1px solid #8d9bff38;border-radius:50%;transform:rotate(-32deg)}
        .slark-marketing dialog::backdrop{background:#03021fbd;backdrop-filter:blur(8px)}
        .slark-marketing dialog{color:#E8E6FF;background:#0E0B40}
        .slark-marketing :is(a,button,summary):focus-visible{outline:2px solid #99B1FF;outline-offset:5px}
        @media(prefers-reduced-motion:reduce){.slark-marketing *, .slark-marketing *::before,.slark-marketing *::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      `}</style>
      <a href="#conteudo" className="sr-only z-50 rounded-lg bg-[#E8E6FF] p-4 text-[#05031F] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Pular para o conteúdo</a>

      <SlarkHeader />

      <main id="conteudo">
        <section className="slark-hero relative isolate border-b border-[#E8E6FF]/10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_50%,#03005B_0%,transparent_60%)]" />
          <div className="relative mx-auto max-w-[1440px] px-6 pb-10 pt-36 sm:px-10 lg:px-16 lg:pb-20 lg:pt-40">
            <div className="relative z-10">
              <div className="micro flex items-center gap-3 text-[#FBE3EA]"><span className="h-1.5 w-1.5 rounded-full bg-[#2E5BFF] shadow-[0_0_15px_#2E5BFF]" /> SLARK EDUCAÇÃO</div>
              <h1 aria-label="A escola mudou. E o jeito de aprender também." className="slark-hero-title mt-7 font-medium leading-[1.06] tracking-[-0.065em]"><span className="block whitespace-nowrap">A escola mudou</span><span className="block whitespace-nowrap">E o jeito de aprender</span><span className="editorial block text-[#FBE3EA]">também</span></h1>
              <p data-motion-reveal className="mt-8 max-w-[43ch] text-base leading-relaxed text-[#E8E6FF]/60 sm:text-lg">IA para conhecer cada estudante. Times para somar diferenças. Uma educação que enxerga pessoas por inteiro.</p>
              <div data-motion-reveal className="mt-9 flex flex-wrap items-center gap-6">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="cta-primary inline-flex items-center gap-7 rounded-full px-7 py-4 text-sm font-medium transition">Conhecer a Slark <Arrow diagonal /></a>
                <a href="#ecossistema" className="inline-flex items-center gap-3 text-sm text-[#E8E6FF]/80">Abrir possibilidades <span aria-hidden="true">↓</span></a>
              </div>
              <div className="mt-12 flex items-center gap-3 border-t border-[#E8E6FF]/10 pt-6 text-xs text-[#E8E6FF]/40"><span aria-hidden="true" className="text-2xl text-[#FBE3EA]">✳</span> Cada mente é um universo.</div>
            </div>
            <div className="slark-hero-visual relative flex min-h-[340px] items-center justify-center lg:absolute lg:bottom-16 lg:right-14 lg:w-[380px]" aria-label="Uma prévia interativa do ecossistema Slark">
              <div aria-hidden="true" className="hero-orbit h-[260px] w-[110%] max-w-[570px]" /><div aria-hidden="true" className="hero-orbit h-[350px] w-[80%] max-w-[450px]" />
              <span aria-hidden="true" className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-[#FBE3EA] shadow-[0_0_24px_#FBE3EA80]" />
              <div className="relative max-w-full -rotate-6"><GlassFolder label="Seu próximo universo" meta="COMECE PELA CURIOSIDADE" art="aurora" tone="dark" action="none" width={275} appear={false} files={PILLARS[0].files} onFileSelect={(_, i) => showFile(PILLARS[0], i)} /></div>
              <span className="micro absolute bottom-4 right-2 text-[#E8E6FF]/40">TOQUE PARA EXPLORAR ↗</span>
            </div>
          </div>
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-x-8 gap-y-4 px-6 pb-7 text-[9px] tracking-[.14em] text-[#E8E6FF]/40 lg:px-10"><span>PERSONALIZAÇÃO COM IA</span><span>APRENDIZAGEM EM TIME</span><span>PROFESSORES NO CENTRO DAS CONEXÕES</span></div>
        </section>

        <section id="ecossistema" className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="micro text-[#E8E6FF]/45">01 / ABRA O ECOSSISTEMA</p><h2 data-motion-title className="mt-5 text-4xl font-medium leading-[1.05] tracking-[-.055em] sm:text-5xl lg:text-6xl">Quatro pastas.<br />{" "}<span className="editorial text-[#FBE3EA]">Infinitas conexões.</span></h2></div><p data-motion-reveal className="max-w-xs text-sm leading-relaxed text-[#E8E6FF]/55">Um método que conecta aluno, professor, conteúdo e gestão. Abra uma pasta e escolha um arquivo para conhecer cada parte.</p></div>
          <div data-motion-group className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:gap-8">{PILLARS.map((pillar, i) => <FolderCard key={pillar.id} pillar={pillar} index={i} onSelect={showFile} />)}</div>
          <p className="mt-6 text-center text-xs leading-relaxed text-[#E8E6FF]/40">Pastas interativas: toque, clique ou use Enter para abrir. Escolha um arquivo para ler os detalhes.</p>
        </section>

        <section data-motion-band className="border-y border-[#E8E6FF]/10 bg-[#0E0B40]/35">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:px-10 lg:py-20">
            <div><p className="micro text-[#E8E6FF]/45">DIFERENÇAS QUE SE COMPLEMENTAM</p><h2 data-motion-title className="mt-5 text-3xl font-medium tracking-[-.04em] sm:text-4xl">Um jeito único de pensar.<br />{" "}<span className="editorial text-[#FBE3EA]">Um time para ir além.</span></h2><p className="mt-5 max-w-md text-sm leading-relaxed text-[#E8E6FF]/55">O mapeamento ajuda a reconhecer características e formar times complementares. Cada estudante pode descobrir e desenvolver novos caminhos.</p></div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">{CHARACTERISTICS.map(item => <div key={item.name} className="rounded-2xl border border-[#E8E6FF]/10 bg-[#05031F]/40 p-5" style={{ "--profile-color": item.color } as CSSProperties}><span aria-hidden="true" className="text-3xl text-[var(--profile-color)]">{item.symbol}</span><h3 className="mt-4 text-sm font-medium">{item.name}</h3><p className="mt-1 text-xs text-[#E8E6FF]/45">{item.text}</p></div>)}</div>
          </div>
        </section>

        <section id="causa" className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20"><div><p className="micro text-[#E8E6FF]/45">02 / A NOSSA CAUSA</p><h2 data-motion-title className="mt-5 max-w-[14ch] text-4xl font-medium leading-[1.08] tracking-[-.05em] sm:text-5xl lg:text-6xl">Pessoas não cabem em <span className="editorial text-[#FBE3EA]">moldes.</span></h2><p className="mt-7 max-w-md text-sm leading-loose text-[#E8E6FF]/55">A crítica de Paulo Freire à educação bancária questiona o aluno como receptor passivo de conteúdo. A Slark também questiona a padronização associada à lógica industrial: a mesma aula, no mesmo ritmo, para uma turma inteira.</p><p className="mt-4 max-w-md text-sm leading-loose text-[#E8E6FF]/55">Nossa proposta parte de outra pergunta: quem são as pessoas desta sala e como podemos ajudá-las a aprender juntas?</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:content-center"><article className="rounded-3xl border border-[#E8E6FF]/15 bg-[#0E0B40]/50 p-7"><span className="editorial text-7xl text-[#FBE3EA]">45<span className="text-4xl">%</span></span><h3 className="mt-5 text-base font-medium">A distração merece atenção.</h3><p className="mt-3 text-xs leading-relaxed text-[#E8E6FF]/55">Dos estudantes brasileiros relataram distração com dispositivos digitais na maioria ou em todas as aulas de matemática.</p><a href={PISA_SOURCE} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-[10px] text-[#AABFFF] underline underline-offset-4">OCDE · PISA 2022 ↗</a></article><article className="rounded-3xl border border-[#E8E6FF]/15 p-7"><span className="editorial text-7xl text-[#FBE3EA]">65<span className="text-4xl">º</span></span><h3 className="mt-5 text-base font-medium">Um desafio coletivo.</h3><p className="mt-3 text-xs leading-relaxed text-[#E8E6FF]/55">Posição do Brasil em matemática entre 81 países e economias no PISA 2022, na classificação divulgada pela Fundação Roberto Marinho.</p><a href="https://futura.frm.org.br/conteudo/educacao-basica/noticia/pisa-2022-por-que-o-brasil-esta-nas-ultimas-posicoes-em-matematica-leitura-ciencias" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-[10px] text-[#AABFFF] underline underline-offset-4">FRM · PISA 2022 ↗</a></article></div></div>
          <figure className="mt-14 flex flex-col gap-7 border-t border-[#E8E6FF]/15 pt-9 sm:flex-row sm:items-start sm:gap-10"><span aria-hidden="true" className="editorial text-7xl leading-none text-[#2E5BFF]">“</span><div><blockquote className="editorial max-w-3xl text-3xl leading-tight text-[#FBE3EA] sm:text-4xl">Os alunos hoje são tratados como números genéricos.</blockquote><figcaption className="mt-5 text-xs text-[#E8E6FF]/45">Janaína · Psicopedagoga <span className="mt-1 block text-[10px] text-[#E8E6FF]/30">Depoimento atribuído pela equipe Slark nos materiais do projeto.</span></figcaption></div></figure>
        </section>

        <section data-motion-band id="slark-live" className="relative border-y border-[#E8E6FF]/10 bg-[#03005B]/45">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-24 lg:px-10 lg:py-24"><div><div className="micro flex items-center gap-3 text-[#FBE3EA]"><span className="h-1.5 w-1.5 rounded-full bg-[#FBE3EA]" /> SLARK LIVE</div><h2 data-motion-title className="mt-6 text-4xl font-medium leading-[1.05] tracking-[-.05em] sm:text-5xl">A sala vira jogo.<br />{" "}<span className="editorial text-[#FBE3EA]">O time faz acontecer.</span></h2><p className="mt-6 max-w-md text-sm leading-loose text-[#E8E6FF]/60">Um PIN conecta a turma a missões, quizzes e desafios em equipe. Os diferentes jeitos de pensar entram em ação, ao vivo.</p><ol className="mt-6 space-y-3 text-xs text-[#E8E6FF]/65"><li>01 · Entre com o PIN da sala.</li><li>02 · Conecte-se ao seu time.</li><li>03 · Encare os desafios com a turma.</li></ol><a href="https://slarklive.vercel.app" target="_blank" rel="noopener noreferrer" className="cta-primary mt-8 inline-flex items-center gap-7 rounded-full px-7 py-4 text-sm">Conhecer o Slark Live <Arrow diagonal /></a></div>
          <div className="relative rounded-[28px] border border-[#E8E6FF]/20 bg-[#0E0B40]/80 p-6 shadow-[0_35px_90px_#00000040] sm:p-9"><div className="flex items-center justify-between text-[9px] tracking-widest text-[#E8E6FF]/45"><span>SLARK LIVE</span><span>EXEMPLO INTERATIVO</span></div><p className="mt-8 text-center text-[10px] tracking-[.2em] text-[#E8E6FF]/40">PIN ILUSTRATIVO</p><p className="mt-2 text-center text-5xl font-medium tracking-[.12em] sm:text-6xl">248 <span className="text-[#A3B6FF]">601</span></p><div className="mt-8 border-t border-[#E8E6FF]/15 pt-7"><h3 className="text-2xl font-medium tracking-tight">O que faz um time ir mais longe?</h3><div className="mt-5 grid gap-3">{["Pensar sempre igual", "Somar diferentes habilidades"].map((answer, index) => <button type="button" key={answer} aria-pressed={liveAnswer === index} onClick={() => setLiveAnswer(index)} className={`flex items-center gap-4 rounded-xl border px-4 py-4 text-left text-xs transition ${liveAnswer === index ? "border-[#8BA5FF] bg-[#2E5BFF]/20" : "border-[#E8E6FF]/15 hover:bg-[#E8E6FF]/5"}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#E8E6FF]/10 text-[10px]">{index === 0 ? "A" : "B"}</span>{answer}</button>)}</div><p role="status" className="mt-5 min-h-10 text-xs leading-relaxed text-[#E8E6FF]/55">{liveAnswer === null ? "Escolha uma resposta e experimente a ideia." : liveAnswer === 1 ? "É isso! Características diferentes ampliam as possibilidades do time." : "Que tal somar os pontos fortes de cada pessoa? As diferenças também ensinam."}</p></div></div></div>
        </section>

        <section id="contato" className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="slark-cta-frame relative overflow-hidden rounded-[32px] border border-[#E8E6FF]/15 bg-[linear-gradient(120deg,#0E0B40,#03005B)] px-7 py-14 text-center sm:px-12 sm:py-20"><span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 text-[240px] leading-none text-[#E8E6FF]/5">✳</span><p className="micro relative text-[#FBE3EA]/70">VAMOS CONVERSAR?</p><h2 data-motion-title className="relative mt-6 text-4xl font-medium leading-tight tracking-[-.05em] sm:text-6xl">A próxima conexão<br />{" "}<span className="editorial text-[#FBE3EA]">pode ser na sua escola.</span></h2><p className="relative mx-auto mt-6 max-w-lg text-sm leading-relaxed text-[#E8E6FF]/55">Conheça o Método Slark e converse com a equipe sobre uma demonstração para a sua instituição.</p><a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="cta-primary relative mt-8 inline-flex items-center gap-8 rounded-full px-8 py-4 text-sm font-medium">Falar com a Slark <Arrow diagonal /></a></div></section>
      </main>

      <footer className="border-t border-[#E8E6FF]/10"><div className="mx-auto max-w-7xl px-6 py-10 lg:px-10"><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center"><div><a href="#" aria-label="Slark Educação, início"><Brand /></a><p className="mt-3 text-xs text-[#E8E6FF]/40">Cada mente é um universo.</p></div><div className="flex flex-wrap gap-6 text-xs text-[#E8E6FF]/65"><a href="https://slark.tech" target="_blank" rel="noopener noreferrer">slark.tech ↗</a><a href="https://instagram.com/slarkedu" target="_blank" rel="noopener noreferrer">@slarkedu ↗</a><a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><a href="/login">Entrar no app ↗</a></div></div><div className="mt-9 flex flex-wrap justify-between gap-4 border-t border-[#E8E6FF]/10 pt-6 text-[10px] text-[#E8E6FF]/35"><span>© 2026 Slark Educação · Um produto Slark - Moorning Group</span><a href="/documentacao">Documentação ↗</a></div></div></footer>

      <dialog ref={dialog} aria-labelledby="slark-detail-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-3xl border border-[#E8E6FF]/20 p-0 shadow-2xl">
        {selected && <div className="p-7 sm:p-9"><div className="flex items-start justify-between gap-4"><p className="micro text-[#AABFFF]">{selected.pillar.label}</p><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Fechar detalhes" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#E8E6FF]/15 text-xl">×</button></div><h2 id="slark-detail-title" className="mt-5 text-3xl font-medium tracking-tight">{selected.pillar.files[selected.index].name}</h2><p className="mt-3 text-xs text-[#FBE3EA]/65">{selected.pillar.files[selected.index].meta}</p><p className="mt-6 text-sm leading-loose text-[#E8E6FF]/70">{selected.pillar.details[selected.index]}</p><p className="mt-6 border-t border-[#E8E6FF]/10 pt-5 text-[10px] leading-relaxed text-[#E8E6FF]/40">Conheça a proposta do ecossistema. Para consultar a disponibilidade de cada recurso na sua escola, fale com a equipe.</p><a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="cta-primary mt-6 inline-flex items-center gap-5 rounded-full px-5 py-3 text-xs">Conversar sobre este recurso <Arrow diagonal /></a></div>}
      </dialog>
    </div>
  )
}
