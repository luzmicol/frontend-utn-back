import './AuthLayout.css'

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className='auth-layout'>
      <div className='auth-content'>
        <div className='auth-content__brand'>
          <img
            src='/loop-wordmark.png'
            alt='LOOP'
            className='auth-content__brand-img'
          />
        </div>
        <h1 className='auth-content__title'>{title}</h1>
        {subtitle && <p className='auth-content__subtitle'>{subtitle}</p>}
        {children}
        {footer && <footer className='auth-content__footer'>{footer}</footer>}
      </div>
    </main>
  )
}
