import { useState } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './Login.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { loginRequest, guestLoginRequest, resendVerificationRequest } from '../app/authApi.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

export default function Login() {
  const navigate = useNavigate()
  const { logIn } = useAppData()
  const { t } = useGlobalHeader()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [lastCredential, setLastCredential] = useState('')
  const [resendMessage, setResendMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const credential = String(formData.get('usercredential') || '').trim()
    const password = String(formData.get('userpwd') || '')

    if (!credential || !password) {
      setErrorMessage(t('auth.loginMissing'))
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setNeedsVerification(false)
      setResendMessage('')
      setLastCredential(credential)

      const response = await loginRequest({
        email: credential,
        password,
      })

      window.localStorage.setItem('mangala.authToken', response.token)
      logIn(response.user)

      navigate('/')
    } catch (error) {
      if (error.message === 'Please verify your email to log in.') {
        setNeedsVerification(true)
      }
      setErrorMessage(error.message || t('auth.loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      setIsSubmitting(true)
      setResendMessage('')
      const response = await resendVerificationRequest({ email: lastCredential })
      setResendMessage(response.message || t('auth.verificationResent'))
    } catch (error) {
      setErrorMessage(error.message || t('auth.verificationResendFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuestLogin = async () => {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      
      const response = await guestLoginRequest()
      
      window.sessionStorage.setItem('mangala.authToken', response.token)
      logIn(response.user)
      
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || t('auth.loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
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
          id="usercredential"
          defaultValue=""
          type="text"
          name="usercredential"
          placeholder={t('auth.usernameOrEmail')}
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
        <div className={styles.rememberdiv}>
          <label htmlFor="rememberme">{t('auth.rememberMe')}</label>
          <input
            id="rememberme"
            type="checkbox"
            defaultChecked={false}
            name="rememberme"
          />
        </div>
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        {needsVerification && (
          <button type="button" className={styles.submitbtn} onClick={handleResendVerification} disabled={isSubmitting} style={{ backgroundColor: '#f0ad4e', marginTop: '10px' }}>
            {t('auth.resendVerification')}
          </button>
        )}
        {resendMessage && <p style={{ color: 'green', fontSize: '0.8rem', marginTop: '5px' }}>{resendMessage}</p>}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting} style={{ marginTop: '10px' }}>
          {isSubmitting ? t('auth.loggingIn') : t('auth.logIn')}
        </button>
        <Link to="/register" className={styles.signupbtn}>
          {t('auth.signUp')}
        </Link>
        <button type="button" className={styles.signupbtn} onClick={handleGuestLogin}>
          {t('auth.playAsGuest')}
        </button>
      </form>
    </div>
  )
}
