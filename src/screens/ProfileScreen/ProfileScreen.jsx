import { User } from 'lucide-react'

export default function ProfileScreen() {
  return (
    <section className='loop-page'>
      <header className='loop-page__header'>
        <h1 className='loop-page__title'>Perfil</h1>
        <p className='loop-page__subtitle'>Tu espacio personal en LOOP</p>
      </header>

      <div className='loop-empty'>
        <span className='loop-empty__icon' aria-hidden='true'>
          <User size={22} />
        </span>
        <h2 className='loop-empty__title'>Perfil en construccion</h2>
        <p className='loop-empty__text'>
          Aqui se mostraran tus datos publicos, seguidores, seguidos y tus publicaciones.
        </p>
      </div>
    </section>
  )
}
