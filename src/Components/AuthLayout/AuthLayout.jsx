import { Infinity as InfinityIcon } from 'lucide-react'
import './AuthLayout.css'

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className='auth-layout'>
      <div className='auth-content'>
        <div className='auth-content__brand'>
          <span className='auth-content__logo' aria-hidden='true'>
            <InfinityIcon size={22} strokeWidth={2.2} />
          </span>
          <span className='auth-content__brand-name'>LOOP</span>
        </div>
        <h1 className='auth-content__title'>{title}</h1>
        {subtitle && <p className='auth-content__subtitle'>{subtitle}</p>}
        {children}
        {footer && <footer className='auth-content__footer'>{footer}</footer>}
      </div>
    </main>
  )
}
