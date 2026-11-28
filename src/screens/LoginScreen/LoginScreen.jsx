import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'
import './LoginScreen.css'

const LOGIN_INTRO_STORAGE_KEY = 'loop_login_intro_seen'

function shouldPlayLoginIntro() {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return false
    }
    return window.sessionStorage.getItem(LOGIN_INTRO_STORAGE_KEY) !== '1'
  } catch {
    return false
  }
}

function LoginScreen() {
  const initial_state = { email: '', password: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()
  const { login } = useAuth()
  const [validationError, setValidationError] = useState(null)
  const [introPhase, setIntroPhase] = useState(() => (shouldPlayLoginIntro() ? 'intro' : 'done'))

  const navigate = useNavigate()

  useEffect(() => {
    if (introPhase !== 'intro') return

    try {
      window.sessionStorage.setItem(LOGIN_INTRO_STORAGE_KEY, '1')
    } catch {
      // Silencioso si sessionStorage no esta disponible
    }

    const leaveTimer = setTimeout(() => {
      setIntroPhase('leaving')
    }, 680)

    const doneTimer = setTimeout(() => {
      setIntroPhase('done')
    }, 1040)

    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFieldChange(event) {
    if (validationError) setValidationError(null)
    handleChangeInput(event)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const email = formState.email.trim()
    const password = formState.password

    if (!email || !password) {
      setValidationError('Completá tu correo electrónico y contraseña para iniciar sesión.')
      return
    }

    setValidationError(null)
    sendRequest(
      () => login(email, password)
    )
  }

  useEffect(() => {
    if (response && !loading) {
      navigate('/')
    }
  }, [response, loading, navigate])

  const isIntroVisible = introPhase !== 'done'

  return (
    <div className='login-screen'>
      {isIntroVisible && (
        <div
          className={`login-intro${introPhase === 'leaving' ? ' login-intro--leaving' : ''}`}
          aria-hidden='true'
        >
          <div className='login-intro__mark'>
            <div className='login-intro__glow' />
            <svg
              className='login-intro__svg'
              viewBox='0 0 100 50'
              xmlns='http://www.w3.org/2000/svg'
            >
              <defs>
                <linearGradient id='loop-intro-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                  <stop offset='0%' stopColor='#a78bfa' />
                  <stop offset='50%' stopColor='#8b5cf6' />
                  <stop offset='100%' stopColor='#7c3aed' />
                </linearGradient>
              </defs>
              <path
                className='login-intro__path'
                d='M 27 11 C 15 11, 8 18, 8 25 C 8 32, 15 39, 27 39 C 39 39, 46 25, 50 25 C 54 25, 61 11, 73 11 C 85 11, 92 18, 92 25 C 92 32, 85 39, 73 39 C 61 39, 54 25, 50 25 C 46 25, 39 11, 27 11 Z'
              />
            </svg>
          </div>
        </div>
      )}

      <div className={`login-screen__content${introPhase === 'intro' ? ' login-screen__content--hidden' : ''}`}>
        <AuthLayout
          title='Iniciar sesión'
          footer={
            <span>
              ¿No tenés una cuenta? <Link to='/register'>Registrate</Link>
              <br />
              ¿No recibiste el correo de verificación? <Link to='/resend-email-verification'>Reenviar</Link>
            </span>
          }
        >
          <Form onSubmit={handleSubmit}>
            <FormField
              label='Correo electrónico'
              name='email'
              type='email'
              placeholder='Correo electrónico'
              value={formState.email}
              onChange={handleFieldChange}
              required
            />
            <FormField
              label='Contraseña'
              name='password'
              type='password'
              placeholder='Contraseña'
              value={formState.password}
              onChange={handleFieldChange}
              required
            />
            <FormButton loading={loading}>Iniciar sesión</FormButton>
            <Link className='form__link' to='/forgot-password'>
              Olvidé mi contraseña
            </Link>
            {validationError && <Alert variant='error'>{validationError}</Alert>}
            {!validationError && error && !loading && (
              <Alert variant='error'>
                {error}
                {/verific/i.test(error) && (
                  <>
                    {' '}
                    <Link to='/resend-email-verification'>Reenviar correo de verificación</Link>.
                  </>
                )}
              </Alert>
            )}
            {response && !loading && (
              <Alert variant='success'>Inicio de sesión exitoso</Alert>
            )}
          </Form>
        </AuthLayout>
      </div>
    </div>
  )
}

export default LoginScreen