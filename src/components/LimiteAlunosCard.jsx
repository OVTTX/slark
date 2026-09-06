import { Users, MessageCircle } from 'lucide-react'

// Card de "limite atingido" — mostrado no lugar do formulário de convidar/importar
// aluno quando a escola já ocupou todas as vagas contratadas na assinatura.
export default function LimiteAlunosCard({ limite, usados }) {
  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 rounded-2xl bg-[#F5C451]/10 flex items-center justify-center mx-auto">
        <Users className="text-[#F5C451]" size={26} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">Limite de alunos atingido</h3>
      <p className="mt-2 text-sm text-texto/65 leading-relaxed">
        Sua escola está no plano contratado para até <span className="text-white font-semibold">{limite}</span> alunos
        {usados != null && <> e já tem <span className="text-white font-semibold">{usados}</span> cadastrados/convidados</>}.
        Para cadastrar mais alunos, faça um upgrade com a equipe Slark.
      </p>
      <a
        href="https://wa.me/5511945699915"
        target="_blank" rel="noopener"
        className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40"
      >
        <MessageCircle size={17} /> Falar com a Slark
      </a>
    </div>
  )
}
