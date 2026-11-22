import { Users } from 'lucide-react'

export default function CommunitiesScreen() {
  return (
    <section className='loop-page'>
      <header className='loop-page__header'>
        <h1 className='loop-page__title'>Comunidades</h1>
        <p className='loop-page__subtitle'>Espacios publicos para compartir intereses</p>
      </header>

      <div className='loop-empty'>
        <span className='loop-empty__icon' aria-hidden='true'>
          <Users size={22} />
        </span>
        <h2 className='loop-empty__title'>Sin comunidades disponibles</h2>
        <p className='loop-empty__text'>
          Aqui vas a poder explorar comunidades activas, unirte y gestionar las tuyas.
        </p>
      </div>
    </section>
  )
}
