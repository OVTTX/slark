import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlano } from '../lib/usePlano'
export default function AcessoLive({children}) {
 const {perfil}=useAuth()
 const {temLive,carregando,erro,nomePlano,recarregarPlano}=usePlano()
 if(carregando)return <p role="status" className="text-sm text-texto/60">Verificando o plano da escola…</p>
 if(temLive)return children
 return <section className="rounded-2xl bg-card border p-8 max-w-xl"><span className="text-xs uppercase tracking-wide text-texto/60">{erro ? 'Plano indisponível' : nomePlano}</span><h1 className="mt-3">Recurso do Plano Live</h1><p className="mt-4 text-sm text-texto/60">{erro || 'O plano contratado pela sua escola não inclui o Slark Live. A direção pode consultar a equipe Slark sobre o Plano Live.'}</p>{erro&&<button className="mt-5 rounded-full bg-azul px-5 py-3 text-sm" onClick={recarregarPlano}>Tentar novamente</button>}<Link className="block mt-6 text-sm underline" to={perfil?.perfil==='admin_slark'?'/admin':`/${perfil?.perfil || 'aluno'}`}>Voltar ao início</Link></section>
}
