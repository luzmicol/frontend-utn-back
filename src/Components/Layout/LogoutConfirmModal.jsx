import { useEffect } from 'react'
import { LogOut, X } from 'lucide-react'
import './LogoutConfirmModal.css'

export default function LogoutConfirmModal({ isOpen, onCancel, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className='logout-modal__overlay'
      onClick={onCancel}
      role='presentation'
    >
      <div
        className='logout-modal__dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby='logout-modal-title'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='logout-modal__header'>
          <span className='logout-modal__icon' aria-hidden='true'>
            <LogOut size={18} />
          </span>
          <button
            type='button'
            className='logout-modal__close'
            onClick={onCancel}
            aria-label='Cerrar dialogo'
          >
            <X size={18} />
          </button>
        </div>

        <h2 id='logout-modal-title' className='logout-modal__title'>
          ¿Cerrar sesion?
        </h2>
        <p className='logout-modal__text'>
          Vas a salir de tu cuenta en LOOP y tendras que volver a iniciar sesion para continuar.
        </p>

        <div className='logout-modal__actions'>
          <button
            type='button'
            className='logout-modal__btn logout-modal__btn--ghost'
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type='button'
            className='logout-modal__btn logout-modal__btn--danger'
            onClick={onConfirm}
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  )
}
