import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function NotFoundScreen() {
  return (
    <main className='app-layout__main' style={{ marginLeft: 0, width: '100%' }}>
      <div className='app-layout__container'>
        <div className='loop-empty'>
          <span className='loop-empty__icon' aria-hidden='true'>
            <AlertCircle size={22} />
          </span>
          <h1 className='loop-empty__title'>Pagina no encontrada</h1>
          <p className='loop-empty__text'>
            La ruta que intentaste abrir no existe en LOOP.
          </p>
          <Link to='/' className='loop-empty__link'>
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
