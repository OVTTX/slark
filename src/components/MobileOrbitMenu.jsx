import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, matchPath } from 'react-router-dom'
import { ChevronUp, ChevronDown, Sun, Moon, LogOut, UserRound, Radio } from 'lucide-react'
import './mobile-orbit-menu.css'

export default function MobileOrbitMenu({items,liveUrl,perfil,landing,tema,themeLocked,onTheme,onClose,onLogout}) {
  const links=[...items,{to:liveUrl,label:'Slark Live',icon:Radio},{to:'/perfil',label:'Meu perfil',icon:UserRound}]
  const {pathname}=useLocation()
  const initial=Math.max(0,links.findIndex(item=>matchPath({path:item.to,end:item.end ?? false},pathname)))
  const [selected,setSelected]=useState(initial)
  const wheel=useRef(null),frame=useRef(0)
  const admin=perfil?.perfil==='admin_slark'
  function move(index,focus=false,smooth=true){
    const node=wheel.current
    if(!node)return
    const row=node.querySelector('.orbit-entry')
    const next=Math.max(0,Math.min(links.length-1,index))
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node.scrollTo({top:next*(row?.getBoundingClientRect().height || 80),behavior:smooth&&!reduce?'smooth':'instant'})
    setSelected(next)
    if(focus)node.querySelectorAll('a')[next]?.focus({preventScroll:true})
  }
  useEffect(()=>{
    const node=wheel.current
    const resize=new ResizeObserver(()=>{if(node)node.style.setProperty('--wheel-space',`${node.clientHeight}px`)})
    if(node){node.style.setProperty('--wheel-space',`${node.clientHeight}px`);resize.observe(node)}
    move(initial,false,false)
    return ()=>{resize.disconnect();cancelAnimationFrame(frame.current)}
  },[])
  function onScroll(){
    cancelAnimationFrame(frame.current)
    frame.current=requestAnimationFrame(()=>{
      const node=wheel.current,row=node?.querySelector('.orbit-entry')
      if(node && row)setSelected(Math.max(0,Math.min(links.length-1,Math.round(node.scrollTop/row.getBoundingClientRect().height))))
    })
  }
  return <div className={`orbit-menu ${admin?'orbit-admin':''}`}>
    <header className="orbit-header"><a href={landing} onClick={onClose}>Slark Educação <span>↗</span></a><p>{perfil?.nome}</p><small>{admin?'ADMINISTRADOR':perfil?.perfil==='diretor'?'DIRETORIA':perfil?.perfil==='professor'?'PROFESSOR':'ESTUDANTE'}</small></header>
    <div className="orbit-stage">
      <svg className="orbit-rail" viewBox="0 0 300 700" preserveAspectRatio="none" aria-hidden="true"><path d="M285 -40 C100 125 100 575 285 740"/></svg>
      <span className="orbit-pointer" aria-hidden="true"/>
      <nav ref={wheel} className="orbit-wheel" aria-label="Navegação mobile" onScroll={onScroll} onKeyDown={event=>{
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault()
          move(event.key==='Home'?0:event.key==='End'?links.length-1:selected+(event.key==='ArrowDown'?1:-1),true)
        }
      }}>
        {links.map(({to,label,icon:Icon,end},index)=>{
          const distance=Math.min(4,Math.abs(index-selected))
          return <div className="orbit-entry" key={to} style={{'--orbit-shift':`${Math.min(68,distance*distance*7)}px`,'--orbit-fade':Math.max(.25,1-distance*.17)}} data-selected={index===selected}>
            <NavLink to={to} end={end} onClick={onClose} onFocus={()=>{if(index!==selected)move(index)}} aria-label={label} className="orbit-link">
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
