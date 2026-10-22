import type { CSSProperties, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { IoHomeOutline, IoVideocamOutline, IoCameraOutline, IoShareSocialOutline, IoHeartOutline } from 'react-icons/io5'
import './gradient-menu.css'

export type GradientMenuItem = {
  title: string; to: string; icon: ReactNode; end?: boolean
  gradientFrom?: string; gradientTo?: string
}
const defaults: GradientMenuItem[] = [
  { title: 'Home', to: '/', icon: <IoHomeOutline />, end: true },
  { title: 'Video', to: '#video', icon: <IoVideocamOutline /> },
  { title: 'Photo', to: '#photo', icon: <IoCameraOutline /> },
  { title: 'Share', to: '#share', icon: <IoShareSocialOutline /> },
  { title: 'Tym', to: '#tym', icon: <IoHeartOutline /> },
]
const colors = [['#0651C3','#56CCF2'],['#6651D5','#A78BFA'],['#086B80','#36BCD3'],['#147A60','#63D7A7'],['#9A5821','#E4AE64']]
export default function GradientMenu({ items = defaults }: { items?: GradientMenuItem[] }) {
  return <ul className="gradient-menu" aria-label="Páginas do perfil">
    {items.map(({ title, to, icon, end, gradientFrom, gradientTo }, index) => <li key={to}>
      <NavLink to={to} end={end} aria-label={title} title={title}
        style={{ '--gradient-from': gradientFrom || colors[index % colors.length][0], '--gradient-to': gradientTo || colors[index % colors.length][1] } as CSSProperties}
        className="gradient-menu-item">
        <span className="gradient-menu-bg" aria-hidden="true" />
        <span className="gradient-menu-glow" aria-hidden="true" />
        <span className="gradient-menu-icon" aria-hidden="true">{icon}</span>
        <span className="gradient-menu-title" aria-hidden="true">{title}</span>
      </NavLink>
    </li>)}
  </ul>
}
