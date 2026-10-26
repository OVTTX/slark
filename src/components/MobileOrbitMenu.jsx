import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, matchPath } from 'react-router-dom'
import { ChevronUp, ChevronDown, Sun, Moon, LogOut, UserRound, Radio } from 'lucide-react'
import './mobile-orbit-menu.css'

export default function MobileOrbitMenu({items,liveUrl,perfil,landing,tema,themeLocked,onTheme,onClose,onLogout}) {
  const links=useMemo(()=>[...items,...(liveUrl?[{to:liveUrl,label:'Slark Live',icon:Radio}]:[]),{to:'/perfil',label:'Meu perfil',icon:UserRound}],[items,liveUrl])
  const {pathname}=useLocation()
  const initial=Math.max(0,links.findIndex(item=>matchPath({path:item.to,end:item.end ?? false},pathname)))
  const [selected,setSelected]=useState(initial)
  const wheel=useRef(null),frame=useRef(0),metrics=useRef({row:80,height:0,entries:[]}),position=useRef(initial)
  const admin=perfil?.perfil==='admin_slark'
  // Keep the curve attached to the actual scroll position, including between rows.
  // A rounded React state with CSS transitions makes icons chase the finger in jumps.
  const paint=useCallback(()=>{
    const node=wheel.current
    if(!node)return
    const {row,height,entries}=metrics.current
    // Mobile browser bars and rotation can resize the rows before ResizeObserver
    // runs. Ignore that intermediate scroll so it cannot change the chosen item.
    if(node.clientHeight!==height || entries[0]?.getBoundingClientRect().height!==row)return
    const progress=Math.max(0,Math.min(links.length-1,node.scrollTop/row))
    position.current=progress
    entries.forEach((entry,index)=>{
      const distance=Math.min(4,Math.abs(index-progress))
      entry.style.setProperty('--orbit-shift',`${Math.min(68,distance*distance*7)}px`)
      entry.style.setProperty('--orbit-fade',String(Math.max(.25,1-distance*.17)))
      entry.style.setProperty('--orbit-focus',String(Math.max(0,1-distance)))
    })
    setSelected(Math.round(progress))
  },[links.length])
  function move(index,focus=false,smooth=true){
    const node=wheel.current
    if(!node)return
    const next=Math.max(0,Math.min(links.length-1,index))
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node.scrollTo({top:next*metrics.current.row,behavior:smooth&&!reduce?'smooth':'instant'})
    if(!smooth||reduce)paint()
    if(focus)node.querySelectorAll('a')[next]?.focus({preventScroll:true})
  }
  useLayoutEffect(()=>{
    const node=wheel.current
    if(!node)return
    const measure=()=>{
      const entries=Array.from(node.querySelectorAll('.orbit-entry'))
      const row=entries[0]?.getBoundingClientRect().height || 80
      if(metrics.current.height===node.clientHeight && metrics.current.row===row && entries.length===metrics.current.entries.length && entries.every((entry,index)=>entry===metrics.current.entries[index]))return
      const index=Math.min(links.length-1,Math.round(position.current))
      node.style.setProperty('--wheel-space',`${node.clientHeight}px`)
      metrics.current={row,height:node.clientHeight,entries}
      node.scrollTo({top:index*metrics.current.row,behavior:'instant'})
      paint()
    }
    measure()
    const resize=new ResizeObserver(measure)
    resize.observe(node)
    if(metrics.current.entries[0])resize.observe(metrics.current.entries[0])
    return ()=>{resize.disconnect();cancelAnimationFrame(frame.current)}
  },[paint,links.length])
  function onScroll(){
    cancelAnimationFrame(frame.current)
    frame.current=requestAnimationFrame(paint)
  }
  return <div className={`orbit-menu ${admin?'orbit-admin':''}`}>
    <header className="orbit-header"><a href={landing} onClick={onClose}>Slark Educação <span>↗</span></a><p>{perfil?.nome}</p><small>{admin?'ADMINISTRADOR':perfil?.perfil==='diretor'?'DIRETORIA':perfil?.perfil==='professor'?'PROFESSOR':'ESTUDANTE'}</small></header>
    <div className="orbit-stage">
      <svg className="orbit-rail" viewBox="0 0 300 700" preserveAspectRatio="none" aria-hidden="true"><path d="M285 -40 C100 125 100 575 285 740"/></svg>
      <span className="orbit-pointer" aria-hidden="true"/>
      <nav ref={wheel} className="orbit-wheel" aria-label="Navegação mobile" onScroll={onScroll} onKeyDown={event=>{
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault()
          const focused=Array.from(event.currentTarget.querySelectorAll('a')).indexOf(event.target.closest('a'))
          move(event.key==='Home'?0:event.key==='End'?links.length-1:(focused<0?selected:focused)+(event.key==='ArrowDown'?1:-1),true)
        }
      }}>
        {links.map(({to,label,icon:Icon,end},index)=>{
          return <div className="orbit-entry" key={to} data-selected={index===selected}>
            <NavLink to={to} end={end} onClick={onClose} onFocus={event=>{
              // Touch focus must not interrupt native momentum or snap scrolling.
              if(event.currentTarget.matches(':focus-visible') && Math.round(position.current)!==index)move(index)
            }} aria-label={label} className="orbit-link">
              <span className="orbit-label">{label}</span><span className="orbit-icon" aria-hidden="true"><Icon size={24}/></span>
            </NavLink>
          </div>
        })}
      </nav>
    </div>
    <footer className="orbit-footer">
      <div className="orbit-browse"><button aria-label="Opção anterior" disabled={selected===0} onClick={()=>move(selected-1,true)}><ChevronUp size={18}/></button><span>Deslize para explorar <small>{selected+1} / {links.length}</small></span><button aria-label="Próxima opção" disabled={selected===links.length-1} onClick={()=>move(selected+1,true)}><ChevronDown size={18}/></button></div>
      <div className="orbit-actions"><button disabled={themeLocked} onClick={onTheme}>{tema==='claro'?<Moon size={16}/>:<Sun size={16}/>}<span>{themeLocked?'Tema da loja':tema==='claro'?'Modo escuro':'Modo claro'}</span></button><button onClick={onLogout}><LogOut size={16}/><span>Sair</span></button></div>
    </footer>
  </div>
}
