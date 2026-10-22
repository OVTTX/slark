import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DemoSwitcher() {
  const { perfil, perfilAdmin, demoAtiva, alternarDemo, alternandoDemo } = useAuth()
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  if (!perfilAdmin) return null

  async function trocar(tipo) {
    setErro('')
    try {
      const result = await alternarDemo(tipo)
      if (result === false) return
      navigate(tipo === 'admin_slark' ? '/admin' : `/${tipo}`)
    } catch (e) {
      setErro(e.message)
    }
  }

  return <section aria-label="Testar contas de demonstração" className="relative mx-4 sm:mx-8 mt-4 rounded-2xl border border-azul/25 bg-card p-4">
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="demo-perfil" className="text-sm font-semibold">Testar perfil</label>
      <select id="demo-perfil" value={demoAtiva ? perfil.perfil : 'admin_slark'} disabled={alternandoDemo}
        onChange={(e) => trocar(e.target.value)} className="rounded-xl border bg-card px-3 py-2 text-texto text-sm">
        <option value="admin_slark">Minha conta admin</option>
        <option value="aluno">Aluno demo</option>
        <option value="professor">Professor demo</option>
        <option value="diretor">Diretor demo</option>
      </select>
      {demoAtiva && <button onClick={() => trocar('admin_slark')} disabled={alternandoDemo} className="text-sm underline">Voltar ao admin</button>}
      <span role="status" className="text-xs text-texto/60">{alternandoDemo ? 'Abrindo perfil…' : demoAtiva ? `${perfil.email} · alterações salvas na demonstração` : 'Contas slarkdemo.com.br · sem trocar seu login'}</span>
    </div>
    {erro && <p role="alert" className="mt-2 text-sm text-red-400">{erro}</p>}
  </section>
}
