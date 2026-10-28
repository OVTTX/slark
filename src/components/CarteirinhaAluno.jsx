import { useEffect, useRef, useState } from 'react'
import { Contact, Loader2, Mail, Phone, RefreshCw, School, Sparkles, Trophy } from 'lucide-react'
import LanyardBadge from '../../components/ui/lanyard-badge'
import { supabase } from '../lib/supabase'
import { usePersonalizacao } from '../context/PersonalizacaoContext'
import LogoSlark from './LogoSlark'
import SeloCaracteristica from './SeloCaracteristica'
import './carteirinha-aluno.css'

const formatarPontos = value => Number(value).toLocaleString('pt-BR')
const CORES = {
  slark: ['#000026', '#91baff'], aurora: ['#134b40', '#b0f5de'], oceano: ['#08465d', '#b4efff'],
  ametista: ['#492276', '#e4c6ff'], ouro: ['#493617', '#f1d69a'], noir: ['#171717', '#cfcfcf'],
  rosa: ['#601c48', '#ffc1e4'], solar: ['#713419', '#ffdab3'], floresta: ['#204d30', '#c4efcf'],
  cosmos: ['#302561', '#d9d1ff'], grafite: ['#2e3942', '#d4e4ee'], rubi: ['#652039', '#ffc5d2'],
}

export function CarteirinhaConteudo({ data, perfil, skin = 'slark', fullscreen = false, onExit }) {
  const host = useRef(null)
  const [size, setSize] = useState({ width: 280, height: 680 })
  const width = size.width
  const [strapColor, inkColor] = CORES[skin] || CORES.slark
  useEffect(() => {
    const node = host.current
    if (!node) return
    const measure = () => {
      const height = node.clientHeight
      const width = fullscreen
        ? Math.max(96, Math.min(360, Math.floor(node.clientWidth - 48), Math.floor((height * .84 - 36) / 1.9)))
        : Math.max(180, Math.min(280, Math.floor(node.clientWidth - 56)))
      const nextHeight = fullscreen ? Math.max(1, height) : Math.max(560, width * 1.5 + 260)
      setSize(previous => previous.width === width && previous.height === nextHeight ? previous : { width, height: nextHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [fullscreen])
  const { aluno, escola, equipe } = data
  const nome = perfil.nome || aluno.nome
  const telefone = escola.telefone?.trim()
  const email = escola.email?.trim()
  const telefoneHref = telefone?.replace(/[^\d+]/g, '')
  const emailValido = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const local = [escola.cidade, escola.estado].filter(Boolean).join(' · ')
  return <section className={`slark-student-card${fullscreen ? ' is-fullscreen' : ''}`} aria-labelledby={fullscreen ? 'carteirinha-fullscreen-title' : 'carteirinha-title'}>
    <header className="slark-card-heading">
      <span className="slark-card-eyebrow"><Contact size={14} /> IDENTIDADE SLARK</span>
      <h2 id={fullscreen ? 'carteirinha-fullscreen-title' : 'carteirinha-title'}>Minha carteirinha</h2>
      <p>Seu universo, sempre com você.</p>
    </header>
    <div ref={host} className="slark-card-stage">
      <span className="slark-card-orbit" aria-hidden="true" />
      <LanyardBadge cardWidth={width} height={`${size.height}px`} onTripleTap={fullscreen ? onExit : undefined}
        interactionLabel={fullscreen ? "Carteirinha Slark. Arraste para balançar. Use Ver verso para virar. No celular, toque três vezes para sair." : undefined}
        strapText="SLARK" strapLabel="CADA MENTE É UM UNIVERSO" strapColor={strapColor} inkColor={inkColor}
        front={<div className="slark-id-face slark-id-front" style={{ fontSize: width / 280 * 14 }}>
          <div className="slark-id-brand"><LogoSlark /><span>ESTUDANTE</span></div>
          <div className="slark-id-portrait">
            {perfil.avatar_url ? <img src={perfil.avatar_url} alt="" draggable={false} /> : <span>{nome?.[0]?.toUpperCase() || 'S'}</span>}
            {aluno.caracteristica && <SeloCaracteristica nome={aluno.caracteristica} tamanho={42} />}
          </div>
          <strong className="slark-id-name">{nome}</strong>
          <span className="slark-id-classroom">{aluno.sala || 'Turma não informada'}</span>
          <div className="slark-id-characteristic"><Sparkles size={13} /><span>{aluno.caracteristica || 'Característica a definir'}</span></div>
          <div className="slark-id-stats">
            <div><small>SEUS PONTOS</small><strong>{formatarPontos(aluno.pontos)}</strong></div>
            <div><small>RANKING DA EQUIPE</small><strong>{equipe ? `${equipe.posicao}º` : '—'}</strong><span>na sala</span></div>
          </div>
          <div className="slark-id-school"><School size={13} /><span>{escola.nome || 'Escola não informada'}</span></div>
        </div>}
        back={<div className="slark-id-face slark-id-back" style={{ fontSize: width / 280 * 14 }}>
          <div className="slark-id-brand"><LogoSlark /><span>SEU UNIVERSO</span></div>
          <School size={30} className="slark-id-school-icon" />
          <small>MINHA ESCOLA</small><strong className="slark-id-school-name">{escola.nome || 'Escola não informada'}</strong>
          {local && <span className="slark-id-location">{local}</span>}
          <div className="slark-id-contact"><small>CONTATO DA ESCOLA</small>
            {telefone && <span><Phone size={12} />{telefone}</span>}
            {email && <span><Mail size={12} />{email}</span>}
            {!telefone && !email && <span>A escola ainda não informou um contato.</span>}
          </div>
          <div className="slark-id-team"><Trophy size={16} /><div><small>MINHA EQUIPE</small><strong>{equipe?.nome || 'Ainda sem equipe'}</strong></div></div>
          <p className="slark-id-motto">Cada mente é um universo.</p>
        </div>} />
    </div>
    <p className="slark-card-hint">{fullscreen ? 'Arraste para balançar. Use “Ver verso” para virar.' : 'Arraste para balançar. Toque na carteirinha ou em “Ver verso” para virar.'}</p>
    <div className="slark-card-details">
      <dl>
        <div><dt>Característica</dt><dd>{aluno.caracteristica || 'A definir'}</dd></div>
        <div><dt>Seus pontos</dt><dd>{formatarPontos(aluno.pontos)} pontos</dd></div>
        <div><dt>Ranking da equipe na sala</dt><dd>{equipe ? `${equipe.posicao}º lugar · ${equipe.nome}` : 'Você ainda não está em uma equipe.'}</dd></div>
        <div><dt>Escola</dt><dd>{escola.nome || 'Não informada'}</dd></div>
      </dl>
      <div className="slark-card-contact"><span>Contato da escola</span>
        {telefone && (telefoneHref?.match(/\d/) ? <a href={`tel:${telefoneHref}`}><Phone size={15} />{telefone}</a> : <p>{telefone}</p>)}
        {email && (emailValido ? <a href={`mailto:${email}`}><Mail size={15} />{email}</a> : <p>{email}</p>)}
        {!telefone && !email && <p>Contato ainda não cadastrado pela escola.</p>}
      </div>
    </div>
  </section>
}

export default function CarteirinhaAluno({ perfil, fullscreen = false, onExit }) {
  const personalizacao = usePersonalizacao()
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    let request = 0
    async function load() {
      const version = ++request
      try {
        const { data, error } = await supabase.rpc('slark_carteirinha_aluno', { p_usuario: perfil.id })
        if (error) throw error
        if (!data?.aluno || !data?.escola) throw Error('Carteirinha indisponível.')
        if (active && version === request) setState({ data, error: '', loading: false })
      } catch {
        if (active && version === request) setState(previous => ({ ...previous, loading: false, error: 'Não foi possível atualizar sua carteirinha. Tente novamente.' }))
      }
    }
    void load()
    window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener('focus', load) }
  }, [perfil.id, retry])
  if (state.loading) return <div role="status" className="slark-card-status"><Loader2 size={22} className="animate-spin" /> Preparando sua carteirinha…</div>
  return <>
    {state.error && <div className="slark-card-error" role="alert">{state.error}<button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} /> Tentar novamente</button></div>}
    {state.data && <CarteirinhaConteudo data={state.data} perfil={perfil} skin={personalizacao?.preferencias?.skin} fullscreen={fullscreen} onExit={onExit} />}
  </>
}
