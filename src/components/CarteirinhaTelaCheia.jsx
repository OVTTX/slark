import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePersonalizacao } from '../context/PersonalizacaoContext'
import CarteirinhaAluno from './CarteirinhaAluno'

const CarteirinhaTelaCheia = forwardRef(function CarteirinhaTelaCheia({ perfil, children }, ref) {
  const dialog = useRef(null)
  const nativeSession = useRef(false)
  const [open, setOpen] = useState(false)
  const { preferencias } = usePersonalizacao() || {}
  const close = useCallback(() => {
    const node = dialog.current
    nativeSession.current = false
    if (node?.open) node.close()
    setOpen(false)
    if (node && document.fullscreenElement === node) void document.exitFullscreen().catch(() => {})
  }, [])

  useImperativeHandle(ref, () => ({
    open() {
      const node = dialog.current
      if (!node || node.open) return
      node.showModal()
      setOpen(true)
      // Run synchronously from the tab click, while the browser still has user activation.
      // Unsupported/rejected native fullscreen keeps the same viewport-filling dialog.
      if (node.requestFullscreen && !document.fullscreenElement) {
        void node.requestFullscreen().then(() => {
          if (!node.open && document.fullscreenElement === node) void document.exitFullscreen().catch(() => {})
        }).catch(() => {})
      }
    },
  }), [])

  useEffect(() => {
    if (!open) return
    const previousBody = document.body.style.overflow
    const previousHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    const keydown = event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.key.toLowerCase() !== 'f' && event.key !== 'Escape') return
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]')) return
      event.preventDefault()
      close()
    }
    const fullscreenChange = () => {
      if (document.fullscreenElement === dialog.current) nativeSession.current = true
      else if (nativeSession.current) close()
    }
    // The native event may already have fired before React committed this effect.
    if (document.fullscreenElement === dialog.current) nativeSession.current = true
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('fullscreenchange', fullscreenChange)
    return () => {
      document.body.style.overflow = previousBody
      document.documentElement.style.overflow = previousHtml
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('fullscreenchange', fullscreenChange)
    }
  }, [open, close])

  useEffect(() => {
    const node = dialog.current
    return () => {
      if (node?.open) node.close()
      if (node && document.fullscreenElement === node) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  return createPortal(<dialog ref={dialog} className="slark-app slark-card-fullscreen"
    data-skin={preferencias?.skin || 'slark'} data-texto={preferencias?.texto || 'padrao'}
    aria-label="Minha carteirinha em tela cheia" aria-modal="true"
    aria-describedby="slark-card-exit-hint" onCancel={event => { event.preventDefault(); close() }} onClose={close}>
    <button type="button" className="slark-card-close" onClick={close} aria-label="Sair da carteirinha em tela cheia"><X size={18} /><span>Sair</span></button>
    {open && (children ? children(close) : <CarteirinhaAluno key={perfil.id} perfil={perfil} fullscreen onExit={close} />)}
    <p id="slark-card-exit-hint" className="slark-card-exit-hint"><span className="slark-card-exit-pc">Pressione <kbd>F</kbd> para sair</span><span className="slark-card-exit-touch">Toque 3 vezes seguidas no cartão para sair</span></p>
  </dialog>, document.body)
})
export default CarteirinhaTelaCheia
