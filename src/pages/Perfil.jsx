import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import { Camera, Loader2, Save, KeyRound, Check } from 'lucide-react'

const ROTULO_PERFIL = {
  admin_slark: 'Equipe Slark',
  diretor: 'Diretor',
  professor: 'Professor',
  aluno: 'Aluno',
}

export default function Perfil() {
  const { perfil, recarregarPerfil } = useAuth()
  const inputArquivoRef = useRef(null)

  const [nome, setNome] = useState(perfil?.nome || '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [avisoNome, setAvisoNome] = useState('')
  const [erroNome, setErroNome] = useState('')

  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [avisoSenha, setAvisoSenha] = useState('')

  async function salvarNome(e) {
    e.preventDefault()
    setErroNome('')
    setAvisoNome('')
    if (!nome.trim()) return
    setSalvandoNome(true)
    try {
      const { error } = await supabase.rpc('atualizar_meu_perfil', { p_nome: nome.trim() })
      if (error) throw error
      await recarregarPerfil()
      setAvisoNome('Nome atualizado!')
    } catch (e) {
      console.error(e)
      setErroNome('Não foi possível atualizar seu nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  async function trocarFoto(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErroFoto('')
    setEnviandoFoto(true)
    try {
      const extensao = arquivo.name.split('.').pop()
      const caminho = `${perfil.id}/avatar-${Date.now()}.${extensao}`
      const { error: eUpload } = await supabase.storage.from('avatars').upload(caminho, arquivo, { upsert: true })
      if (eUpload) throw eUpload

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(caminho)
      const { error: eUpdate } = await supabase.rpc('atualizar_meu_perfil', { p_avatar_url: publicUrlData.publicUrl })
      if (eUpdate) throw eUpdate

      await recarregarPerfil()
    } catch (e) {
      console.error(e)
      setErroFoto('Não foi possível enviar sua foto. Tente uma imagem menor (até 2MB).')
    } finally {
      setEnviandoFoto(false)
      if (inputArquivoRef.current) inputArquivoRef.current.value = ''
    }
  }

  async function trocarSenha(e) {
    e.preventDefault()
    setErroSenha('')
    setAvisoSenha('')

    if (novaSenha.length < 6) { setErroSenha('A nova senha precisa ter pelo menos 6 caracteres.'); return }
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não coincidem.'); return }

    setSalvandoSenha(true)
    try {
      // Verifica a senha atual reautenticando o usuário com ela
      const { error: eVerifica } = await supabase.auth.signInWithPassword({ email: perfil.email, password: senhaAtual })
      if (eVerifica) { setErroSenha('Senha atual incorreta.'); return }

      const { error: eAtualiza } = await supabase.auth.updateUser({ password: novaSenha })
      if (eAtualiza) throw eAtualiza

      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('')
      setAvisoSenha('Senha alterada com sucesso!')
    } catch (e) {
      console.error(e)
      setErroSenha('Não foi possível alterar sua senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <AppLayout>
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Meu Perfil</h1>
        <p className="mt-2 text-texto/60">Gerencie seus dados de acesso.</p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Foto + dados */}
          <div className="rounded-2xl bg-card border p-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                {perfil?.avatar_url ? (
                  <img src={perfil.avatar_url} alt="Sua foto" className="w-20 h-20 rounded-full object-cover border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-azul/30 flex items-center justify-center text-white text-2xl font-mono">
                    {perfil?.nome?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => inputArquivoRef.current?.click()}
                  disabled={enviandoFoto}
                  title="Trocar foto"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-azul hover:bg-azul-puro text-white flex items-center justify-center shadow-lg transition disabled:opacity-60"
                >
                  {enviandoFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input ref={inputArquivoRef} type="file" accept="image/*" onChange={trocarFoto} className="hidden" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-lg truncate">{perfil?.nome}</div>
                <div className="text-sm text-texto/50 truncate">{perfil?.email}</div>
                <span className="inline-flex mt-2 items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-azul/20 text-azul">
                  {ROTULO_PERFIL[perfil?.perfil] || 'Usuário'}
                </span>
              </div>
            </div>
            {erroFoto && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erroFoto}</p>}

            <form onSubmit={salvarNome} className="mt-6 pt-6 border-t space-y-3">
              <label className="block text-sm font-medium text-texto/70">Nome</label>
              <div className="flex gap-2">
                <input
                  value={nome} onChange={(e) => setNome(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
                <button
                  type="submit" disabled={salvandoNome}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-azul hover:bg-azul-puro text-white font-medium transition disabled:opacity-60"
                >
                  {salvandoNome ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>
              {avisoNome && <p className="text-sm text-[#3FD08A] flex items-center gap-1.5"><Check size={14} /> {avisoNome}</p>}
              {erroNome && <p className="text-sm text-red-400">{erroNome}</p>}
            </form>
          </div>

          {/* Trocar senha */}
          <div className="rounded-2xl bg-card border p-6">
            <div className="flex items-center gap-2 text-white font-semibold"><KeyRound size={18} className="text-azul" /> Alterar senha</div>
            <form onSubmit={trocarSenha} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Senha atual</label>
                <input
                  type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nova senha</label>
                <input
                  type="password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password" required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>

              {erroSenha && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erroSenha}</p>}
              {avisoSenha && <p className="text-sm text-[#3FD08A] bg-[#3FD08A]/10 px-4 py-2.5 rounded-xl flex items-center gap-1.5"><Check size={14} /> {avisoSenha}</p>}

              <button
                type="submit" disabled={salvandoSenha}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvandoSenha && <Loader2 size={18} className="animate-spin" />}
                {salvandoSenha ? 'Alterando…' : 'Alterar senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
