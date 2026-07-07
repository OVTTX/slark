import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { UserPlus, X, Loader2 } from 'lucide-react'

// Botão + modal reutilizável: diretor ou professor cadastram um aluno pelo e-mail.
// Na primeira vez que o aluno usar esse e-mail na tela de login, ele cria a própria senha.
export default function ConvidarAlunoModal({ salas = [], onConvidado }) {
  const { perfil } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', sala_id: salas[0]?.id || '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  function abrir() {
    setForm({ nome: '', email: '', sala_id: salas[0]?.id || '' })
    setErro('')
    setSucesso('')
    setAberto(true)
  }

  async function enviar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSucesso('')
    try {
      const { error } = await supabase.from('convites_aluno').insert({
        nome: form.nome,
        email: form.email.trim().toLowerCase(),
        escola_id: perfil.escola_id,
        sala_id: form.sala_id || null,
        criado_por: perfil.id,
      })
      if (error) {
        if (error.code === '23505') throw new Error('Já existe um convite ou conta com esse e-mail.')
        throw error
      }
      setSucesso(`Convite criado para ${form.nome}. Peça para ele acessar a tela de login com o e-mail ${form.email} e criar a senha.`)
      onConvidado?.()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível criar o convite.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <button
        onClick={abrir}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
      >
        <UserPlus size={18} /> Convidar aluno
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Convidar aluno</h2>
              <button onClick={() => setAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>

            {sucesso ? (
              <div>
                <p className="text-sm text-[#3FD08A] bg-[#3FD08A]/10 px-4 py-3 rounded-xl leading-relaxed">{sucesso}</p>
                <button
                  onClick={() => setAberto(false)}
                  className="w-full mt-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome do aluno</label>
                  <input
                    required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">E-mail do aluno</label>
                  <input
                    required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="aluno@email.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                {salas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-texto/70 mb-1.5">Sala</label>
                    <select
                      value={form.sala_id} onChange={(e) => setForm({ ...form, sala_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                    >
                      <option value="">Sem sala definida</option>
                      {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                )}

                {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

                <button
                  type="submit" disabled={salvando}
                  className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {salvando && <Loader2 size={18} className="animate-spin" />}
                  {salvando ? 'Enviando…' : 'Criar convite'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
