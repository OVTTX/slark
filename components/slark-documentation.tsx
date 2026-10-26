"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { SlarkHeader } from "./ui/slark-header"

const CHAPTERS = [
  { id: "visao-geral", label: "Visão geral", title: "Cada mente é um universo.", intro: "Conheça a proposta que conecta personalização, colaboração e tecnologia na educação.", sections: [
    { title: "O que é a Slark?", text: "A Slark Educação é uma proposta de ecossistema educacional do Moorning Group. Seu método usa a tecnologia para apoiar o reconhecimento das características de cada estudante e aproximar alunos, professores, conteúdo e gestão." },
    { title: "O estudante como ponto de partida", text: "Aprender não precisa seguir um único ritmo. A proposta valoriza a participação dos estudantes, o trabalho em times complementares e o acompanhamento do desenvolvimento ao longo da jornada." },
    { title: "Como usar esta documentação", text: "Explore os tópicos ao lado para entender a metodologia, as características, os pilares do ecossistema e a dinâmica do Slark Live. Este guia apresenta a proposta; a disponibilidade de cada recurso deve ser consultada com a Slark." },
  ] },
  { id: "nossa-causa", label: "Nossa causa", title: "Pessoas não cabem em moldes.", intro: "Uma educação com espaço para participação, diferenças e novas conexões.", sections: [
    { title: "Da recepção à participação", text: "A crítica de Paulo Freire à educação bancária questiona a ideia do aluno como receptor passivo. A Slark se aproxima dessa reflexão ao propor experiências em que os estudantes investigam, colaboram e participam da construção do conhecimento." },
    { title: "A atenção precisa de contexto", text: "Na nota do Brasil do PISA 2022, a OCDE informa que 45% dos estudantes relataram distração com dispositivos digitais na maioria ou em todas as aulas de matemática. Esse dado descreve um contexto específico: não equivale a um diagnóstico geral de falta de atenção." },
    { title: "Uma pergunta que orienta o método", text: "Quem são as pessoas desta sala e como podemos ajudá-las a aprender juntas? O método parte dessa pergunta para conectar o planejamento docente aos diferentes caminhos de aprendizagem." },
  ] },
  { id: "metodologia", label: "Método Slark", title: "Conhecer. Conectar. Desenvolver.", intro: "Uma jornada que transforma características individuais em oportunidades de aprendizagem coletiva.", sections: [
    { title: "01 · Organizar a escola", text: "A jornada começa com a organização de estudantes, turmas e educadores. Esse contexto permite acompanhar o percurso pedagógico de cada turma." },
    { title: "02 · Mapear características", text: "O App Slark propõe um mapeamento apoiado por IA para reconhecer características presentes na aprendizagem. A leitura deve considerar o contexto do estudante e pode evoluir com ele." },
    { title: "03 · Formar times complementares", text: "Times de 3 a 4 estudantes aproximam diferentes características. A colaboração oferece espaço para contribuir com os próprios pontos fortes e desenvolver novas habilidades com os colegas." },
    { title: "04 · Aprender em ação", text: "O professor conduz as experiências com o apoio da Aula Slark e dos materiais Runaway. Quizzes e desafios com Slark Live conectam o conteúdo à participação da turma." },
    { title: "05 · Acompanhar a evolução", text: "Pontos e Selos reconhecem o progresso. A proposta prevê um novo Selo a cada 50 pontos. O acompanhamento pedagógico considera o percurso do estudante, com interpretação dos educadores." },
  ] },
  { id: "caracteristicas", label: "Características", title: "Diferenças que se complementam.", intro: "Quatro características para abrir conversas sobre como cada estudante contribui e aprende.", sections: [
    { title: "Observador", text: "Percebe relações e identifica conexões. Seu olhar ajuda o time a considerar o contexto e reconhecer possibilidades.", color: "#2E5BFF" },
    { title: "Detalhista", text: "Cuida das etapas e observa particularidades. Contribui para organizar a execução e revisar o que o time está construindo.", color: "#F5C451" },
    { title: "Criativo", text: "Explora ideias e imagina alternativas. Ajuda o grupo a experimentar caminhos e fazer novas perguntas.", color: "#C44DFF" },
    { title: "Raciocínio Lógico", text: "Estrutura caminhos e analisa relações. Apoia o time na organização de argumentos e na resolução de problemas.", color: "#3FD08A" },
    { title: "Um mapa, nunca uma definição", text: "As características não são diagnósticos de personalidade nem categorias fixas de capacidade. Um estudante pode desenvolver diferentes características e aprender de várias formas." },
  ] },
  { id: "ecossistema", label: "Ecossistema", title: "Quatro pilares. Uma conexão.", intro: "Cada parte da Slark tem um papel na jornada da escola.", sections: [
    { title: "App Slark · Para estudantes", text: "Reúne a proposta de mapeamento de características, formação de times complementares e reconhecimento do progresso por pontos e Selos." },
    { title: "Aula Slark · Para educadores", text: "Propõe apoio ao professor com Termômetro de Engajamento, Diário de Aula apoiado por IA e uma Rede de Práticas Docentes. Os registros e as sugestões apoiam a interpretação pedagógica do educador." },
    { title: "Ecossistema Runaway · Material didático", text: "Conecta apostilas físicas e digitais à metodologia. A proposta inclui integração com IA, mapas mentais ao final dos capítulos e quizzes com Slark Live." },
    { title: "Dashboard Gestão · Para gestores", text: "Organiza a proposta de mapa de competências, leitura consolidada das características e relatórios de evolução para apoiar o planejamento pedagógico." },
  ] },
  { id: "slark-live", label: "Slark Live", title: "A sala vira jogo.", intro: "Quizzes ao vivo, desafios em equipe e diferentes jeitos de pensar em ação.", sections: [
    { title: "01 · Receba o PIN", text: "Acesse o Slark Live e utilize o PIN compartilhado para entrar na sala da atividade. O PIN apresentado na página inicial é apenas ilustrativo." },
    { title: "02 · Conecte-se ao time", text: "Siga as orientações do professor para participar da dinâmica com a turma. A proposta valoriza a colaboração e a contribuição de diferentes características." },
    { title: "03 · Participe dos desafios", text: "Responda aos quizzes e participe dos desafios conduzidos na sessão. As respostas podem abrir espaço para conversa, revisão de conceitos e novas descobertas em grupo." },
  ] },
  { id: "agradecimentos", label: "Agradecimentos", title: "Educar também é construir junto.", intro: "Nosso reconhecimento a quem inspira esta jornada.", sections: [] },
  { id: "fontes", label: "Fontes e referências", title: "Ideias com fundamento.", intro: "Referências para aprofundar a leitura sobre educação, participação e o contexto da aprendizagem.", sections: [
    { title: "Paulo Freire · Pedagogia do Oprimido", text: "Referência para a discussão sobre educação bancária, diálogo e participação do estudante na construção do conhecimento." },
    { title: "José Moran · Mudando a educação com metodologias ativas", text: "Texto de 2015, publicado na coleção Mídias Contemporâneas, que discute metodologias ativas e o protagonismo do estudante." },
    { title: "OCDE · PISA 2022 — Nota do Brasil", text: "Fonte do indicador de distração com dispositivos digitais citado na seção Nossa causa. Consulte a nota para conhecer o recorte da pesquisa e os demais resultados." },
  ] },
]

function initialChapter() {
  const hash = window.location.hash.slice(1)
  return CHAPTERS.some(chapter => chapter.id === hash) ? hash : CHAPTERS[0].id
}

export default function SlarkDocumentation() {
  const [activeId, setActiveId] = useState(initialChapter)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = CHAPTERS.findIndex(chapter => chapter.id === activeId)
  const chapter = CHAPTERS[activeIndex]

  useEffect(() => {
    const title = document.title
    document.title = "Slark Educação"
    const updateHash = () => setActiveId(initialChapter())
    window.addEventListener("hashchange", updateHash)
    return () => { document.title = title; window.removeEventListener("hashchange", updateHash) }
  }, [])

  function selectChapter(id: string) {
    setActiveId(id)
    window.history.replaceState(null, "", `#${id}`)
  }
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % CHAPTERS.length
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + CHAPTERS.length) % CHAPTERS.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = CHAPTERS.length - 1
    else return
    event.preventDefault()
    selectChapter(CHAPTERS[next].id)
    tabs.current[next]?.focus()
  }

  return <div className="slark-doc min-h-screen bg-[#05031F] text-[#E8E6FF]">
    <style>{`
      .slark-doc{font-family:'Plus Jakarta Sans',sans-serif;color-scheme:dark;background-image:radial-gradient(ellipse at 90% 0%,#03005b80,transparent 50%)}
      .slark-doc :is(a,button):focus-visible{outline:2px solid #99b1ff;outline-offset:4px}
      .slark-doc .doc-kicker{font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase}
      .slark-doc .doc-tab{color:#e8e6ff80;transition:background .2s,color .2s}
      .slark-doc .doc-tab:hover{color:#e8e6ff;background:#ffffff08}
      .slark-doc .doc-tab[aria-selected=true]{background:#2e5bff20;color:#e8e6ff;border-color:#2e5bff80}
      .slark-doc .doc-panel{animation:slark-doc-appear .3s ease-out}
      @keyframes slark-doc-appear{from{opacity:.4;transform:translateY(8px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion: reduce) and (max-width: 767px){.slark-doc .doc-panel{animation:none}.slark-doc .doc-tab{transition:none}}
    `}</style>
    <a href="#documentacao-conteudo" className="sr-only z-50 rounded-lg bg-[#E8E6FF] p-4 text-[#05031F] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Pular para o conteúdo</a>
    <SlarkHeader documentation />
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-10">
      <div className="border-b border-[#E8E6FF]/10 pb-12">
        <a href="/" className="text-xs text-[#E8E6FF]/50 hover:text-[#E8E6FF]">← Voltar ao início</a>
        <p className="doc-kicker mt-10 text-[#9FB3FF]">Slark Educação / Documentação</p>
        <h1 className="mt-5 text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[1.05] tracking-[-.06em]">Por trás de cada<br /><span className="font-bold italic text-[#FBE3EA]">nova possibilidade.</span></h1>
        <p className="mt-6 max-w-xl text-sm leading-loose text-[#E8E6FF]/55 sm:text-base">O Método Slark, suas conexões e as ideias que o sustentam. Explore o guia e descubra como cada parte se encontra.</p>
      </div>
      <div className="grid gap-10 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20">
        <aside className="min-w-0"><div className="lg:sticky lg:top-28">
          <p className="doc-kicker mb-4 text-[#E8E6FF]/35">Explore a documentação</p>
          <div role="tablist" aria-label="Tópicos da documentação" aria-orientation="vertical" className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {CHAPTERS.map((item, index) => <button type="button" key={item.id} id={`tab-${item.id}`} ref={element => { tabs.current[index] = element }} role="tab" aria-selected={activeId === item.id} aria-controls={`panel-${item.id}`} tabIndex={activeId === item.id ? 0 : -1} onClick={() => selectChapter(item.id)} onKeyDown={event => handleTabKey(event, index)} className="doc-tab flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left text-xs font-medium"><span aria-hidden="true" className="text-[9px] opacity-40">0{index + 1}</span>{item.label}</button>)}
          </div>
          <a href="https://wa.me/5511945699915" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex gap-3 text-xs text-[#9FB3FF]">Ainda tem dúvidas? Fale com a Slark ↗</a>
        </div></aside>
        <div id="documentacao-conteudo" className="min-w-0">
          <article key={chapter.id} id={`panel-${chapter.id}`} role="tabpanel" aria-labelledby={`tab-${chapter.id}`} tabIndex={0} className="doc-panel rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#99B1FF]">
            <p className="doc-kicker text-[#9FB3FF]">§ 0{activeIndex + 1} / {chapter.label}</p>
            <h2 className="mt-5 max-w-[22ch] text-3xl font-medium leading-tight tracking-[-.04em] sm:text-4xl">{chapter.title}</h2>
            <p className="mt-5 max-w-2xl text-sm leading-loose text-[#E8E6FF]/55">{chapter.intro}</p>
            {chapter.id === "agradecimentos" ? <>
              <div className="mt-9 max-w-xl">{["Nossa comunidade"].map((name, index) => <section key={name} className="rounded-2xl border border-[#E8E6FF]/15 bg-[#0E0B40]/50 p-6"><span aria-hidden="true" className="text-3xl text-[#FBE3EA]">{["✳", "✦", "◎"][index]}</span><h3 className="mt-8 text-lg font-medium tracking-tight">{name}</h3><p className="mt-3 text-xs leading-relaxed text-[#E8E6FF]/45">Nosso agradecimento.</p></section>)}</div>
              <p className="mt-8 text-sm leading-loose text-[#E8E6FF]/55">A Slark valoriza a troca de ideias e a construção coletiva de uma educação mais humana. Obrigado por fazer parte dessa história.</p>
            </> : <div className="mt-9 space-y-7">{chapter.sections.map(section => <section key={section.title} className="border-t border-[#E8E6FF]/10 pt-7"><h3 className="flex items-center gap-3 text-base font-semibold">{"color" in section && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: section.color as string }} />}{section.title}</h3><p className="mt-3 max-w-2xl text-sm leading-loose text-[#E8E6FF]/60">{section.text}</p></section>)}</div>}
            {chapter.id === "slark-live" && <a href="https://slarklive.vercel.app" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-6 rounded-full bg-[#2E5BFF] px-6 py-4 text-sm text-[#FFFFFF] transition hover:bg-[#416AFF]">Abrir Slark Live ↗</a>}
            {chapter.id === "fontes" && <a href="https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/brazil_61690648-en.html" target="_blank" rel="noopener noreferrer" className="mt-7 inline-block text-xs text-[#9FB3FF] underline underline-offset-4">Ler a nota do Brasil · OCDE ↗</a>}
            <div className="mt-12 flex items-center justify-between gap-5 border-t border-[#E8E6FF]/10 pt-6 text-xs">
              <span className="text-[#E8E6FF]/35">{activeIndex + 1} / {CHAPTERS.length}</span>
              <button type="button" onClick={() => { const next = (activeIndex + 1) % CHAPTERS.length; selectChapter(CHAPTERS[next].id); tabs.current[next]?.focus() }} className="rounded-full border border-[#E8E6FF]/15 px-5 py-3 text-[#E8E6FF]/80 hover:bg-[#E8E6FF]/5">{activeIndex === CHAPTERS.length - 1 ? "Voltar à visão geral" : CHAPTERS[activeIndex + 1].label} →</button>
            </div>
          </article>
        </div>
      </div>
    </main>
    <footer className="border-t border-[#E8E6FF]/10 px-6 py-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-[11px] text-[#E8E6FF]/40"><p>© 2026 Slark Educação · Um produto Slark - Moorning Group</p><a href="/">Voltar ao início ↗</a></div></footer>
  </div>
}
