import { useState } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './Register.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { registerRequest, googleAuthRequest } from '../app/authApi.js'
import { GoogleLogin } from '@react-oauth/google'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,15}$/
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 32

export default function Register() {
  const navigate = useNavigate()
  const { registerUser } = useAppData()
  const { t } = useGlobalHeader()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const username = String(formData.get('username') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('userpwd') || '')
    const confirmPassword = String(formData.get('confirmpwd') || '')

    if (!username || !email || !password) {
      setErrorMessage(t('auth.registerMissing'))
      return
    }

    if (!USERNAME_REGEX.test(username)) {
      setErrorMessage(t('auth.usernameRules'))
      return
    }

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      setErrorMessage(
        t('auth.passwordLength', {
          min: PASSWORD_MIN_LENGTH,
          max: PASSWORD_MAX_LENGTH,
        }),
      )
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordsNoMatch'))
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      const response = await registerRequest({
        username,
        email,
        password,
      })

      window.localStorage.setItem('mangala.authToken', response.token)
      registerUser(response.user)
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || t('auth.registrationFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      
      const response = await googleAuthRequest({ credential: credentialResponse.credential })
      
      window.localStorage.setItem('mangala.authToken', response.token)
      registerUser(response.user)
      
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || t('auth.registrationFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleError = () => {
    setErrorMessage(t('auth.registrationFailed') || 'Google registration failed')
  }

  return (
    <div className={styles.container}>
      <AuthBrand
        wrapperClassName={styles.labeldiv}
        logoClassName={styles.logolabel}
        titleClassName={styles.label}
      />
      <form className={styles.formdiv} onSubmit={handleSubmit}>
        <input
          id="username"
          defaultValue=""
          type="text"
          name="username"
          placeholder={t('auth.username')}
          className={styles.textinput}
        />
        <input
          id="email"
          defaultValue=""
          type="email"
          name="email"
          placeholder={t('auth.email')}
          className={styles.textinput}
        />
        <input
          id="userpwd"
          defaultValue=""
          type="password"
          name="userpwd"
          placeholder={t('auth.password')}
          className={styles.textinput}
        />
        <input
          id="confirmpwd"
          defaultValue=""
          type="password"
          name="confirmpwd"
          placeholder={t('auth.confirmPassword')}
          className={styles.textinput}
        />
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting}>
          {isSubmitting ? t('auth.signingUp') : t('auth.signUp')}
        </button>
      </form>
      <hr className={styles.horizline} data-content={t('common.or')} />
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '10px' }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="filled_black"
          text="signup_with"
          shape="rectangular"
        />
      </div>
      <Link to="/login" className={styles.submitbtn}>
        {t('auth.backToLogin')}
      </Link>
    </div>
  )
}
