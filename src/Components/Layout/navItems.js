import { Home, Compass, Users, User } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/explore', label: 'Explorar', icon: Compass },
  { to: '/communities', label: 'Comunidades', icon: Users },
  { to: '/profile', label: 'Perfil', icon: User }
]
