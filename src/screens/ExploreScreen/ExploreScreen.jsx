import { Compass } from 'lucide-react'

export default function ExploreScreen() {
  return (
    <section className='loop-page'>
      <header className='loop-page__header'>
        <h1 className='loop-page__title'>Explorar</h1>
        <p className='loop-page__subtitle'>Descubri personas y publicaciones en LOOP</p>
      </header>

      <div className='loop-empty'>
        <span className='loop-empty__icon' aria-hidden='true'>
          <Compass size={22} />
        </span>
        <h2 className='loop-empty__title'>Nada para explorar por ahora</h2>
        <p className='loop-empty__text'>
          Proximamente vas a poder buscar usuarios y recorrer publicaciones destacadas desde esta seccion.
        </p>
      </div>
    </section>
  )
}
