export default function SlarkLiveRoom({ pin }) {
  if (!/^\d{6}$/.test(String(pin || ''))) return null
  let href = null
  try {
    const url = new URL(import.meta.env.VITE_SLARK_LIVE_URL)
    if (url.protocol === 'https:') {
      url.pathname = '/'
      url.search = new URLSearchParams({ pin }).toString()
      url.hash = ''
      href = url.href
    }
  } catch { /* A hospedagem é configurada no ambiente, nunca por alunos. */ }
  return (
    <section className="mt-8 rounded-2xl border border-azul/30 bg-azul/10 p-5" aria-label="Slark Live Room">
      <p className="text-xs uppercase tracking-widest text-azul">Ao final do capítulo</p>
      <h3 className="mt-2 text-xl font-bold text-white">Slark Live Room</h3>
      <p className="mt-2 text-sm text-texto/70">Reúna seu quarteto da Slark. O professor conduz os slides e abre as perguntas para vocês responderem juntos.</p>
      <p className="mt-4 text-2xl font-bold tracking-widest text-white">PIN {pin}</p>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 rounded-full bg-azul px-5 py-2.5 text-sm font-semibold text-white">Entrar com meu quarteto ↗</a> : <p className="mt-3 text-sm text-texto/60">Use este PIN no endereço do Slark Live informado pelo professor.</p>}
      <p className="mt-3 text-xs text-texto/50">Usem um dispositivo por quarteto e o código da equipe entregue pelo professor.</p>
    </section>
  )
}
