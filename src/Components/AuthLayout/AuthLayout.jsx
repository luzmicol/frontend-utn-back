import './AuthLayout.css'
import slackLogo from '../../assets/slack-logo.svg'

/* Casca visual compartida de las pantallas de autenticacion, estilo Slack:
   fondo blanco, logo del wordmark centrado, titulo de 48px como anclaje
   visual y el resto del contenido compacto sobre el mismo eje central. */
export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className='auth-layout'>
      <div className='auth-content'>
        <img
          className='auth-content__logo'
          src={slackLogo}
          alt=''
          aria-hidden='true'
        />
        <h1 className='auth-content__title'>{title}</h1>
        {subtitle && <p className='auth-content__subtitle'>{subtitle}</p>}
        {children}
        {footer && <footer className='auth-content__footer'>{footer}</footer>}
      </div>
    </main>
  )
}
