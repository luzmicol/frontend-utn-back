import { Home, Compass, Users, MessageSquare, User, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/explore', label: 'Explorar', icon: Compass },
  { to: '/communities', label: 'Comunidades', icon: Users },
  { to: '/messages', label: 'Mensajes', icon: MessageSquare },
  { to: '/profile', label: 'Perfil', icon: User },
  { to: '/settings', label: 'Configuracion', icon: Settings }
]
