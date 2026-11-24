import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import './SettingsScreen.css'

const THEME_OPTIONS = [
  {
    id: 'auto',
    label: 'Automatico',
    description: 'Sigue la preferencia de apariencia de tu sistema operativo.',
    icon: Monitor
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Interfaz luminosa y minimalista con tarjetas blancas.',
    icon: Sun
  },
  {
    id: 'dark',
    label: 'Oscuro',
    description: 'Tema oscuro clasico de LOOP.',
    icon: Moon
  }
]

export default function SettingsScreen() {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme()

  return (
    <section className='loop-page settings-page'>
      <header className='settings-header'>
        <h1 className='settings-header__title'>Configuracion</h1>
        <p className='settings-header__subtitle'>
          Personaliza como se ve LOOP en este dispositivo.
        </p>
      </header>

      <div className='settings-card'>
        <div className='settings-card__header'>
          <h2 className='settings-card__title'>Apariencia</h2>
          <p className='settings-card__desc'>
            Elegi entre modo automatico, claro u oscuro. Tu preferencia se guarda en este navegador.
          </p>
        </div>

        <div
          className='theme-options'
          role='radiogroup'
          aria-label='Selector de apariencia'
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = themePreference === option.id
            return (
              <button
                key={option.id}
                type='button'
                role='radio'
                aria-checked={isSelected}
                className={`theme-option${isSelected ? ' theme-option--selected' : ''}`}
                onClick={() => setThemePreference(option.id)}
              >
                <span className='theme-option__icon' aria-hidden='true'>
                  <Icon size={20} strokeWidth={2} />
                </span>
                <div className='theme-option__body'>
                  <span className='theme-option__label'>
                    {option.label}
                    {option.id === 'auto' && (
                      <span className='theme-option__badge'>
                        {resolvedTheme === 'light' ? 'Claro' : 'Oscuro'}
                      </span>
                    )}
                  </span>
                  <span className='theme-option__desc'>{option.description}</span>
                </div>
                <span
                  className={`theme-option__check${isSelected ? ' theme-option__check--active' : ''}`}
                  aria-hidden='true'
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
