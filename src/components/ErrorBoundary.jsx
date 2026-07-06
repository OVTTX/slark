import { Component } from 'react'

// Captura erros de renderização para não quebrar o app inteiro (tela branca)
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }
  static getDerivedStateFromError(erro) {
    return { erro }
  }
  componentDidCatch(erro, info) {
    console.error('[Slark] Erro capturado:', erro, info)
  }
  render() {
    if (this.state.erro) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg text-texto font-display p-8">
          <div className="max-w-md text-center">
            <div className="text-5xl mb-4">🛠️</div>
            <h1 className="text-2xl font-bold text-white">Algo deu errado por aqui.</h1>
            <p className="mt-3 text-texto/60 leading-relaxed">
              Tivemos um probleminha ao carregar esta tela. Tente recarregar a página — se continuar, fale com a equipe Slark.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
