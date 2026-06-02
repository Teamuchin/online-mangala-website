import { useState } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './Login.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { loginRequest } from '../app/authApi.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

export default function Login() {
  const navigate = useNavigate()
  const { continueAsGuest, logIn } = useAppData()
  const { t } = useGlobalHeader()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      const response = await loginRequest({
        email: credential,
        password,
      })

      window.localStorage.setItem('mangala.authToken', response.token)
      logIn(response.user)

      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || t('auth.loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuestLogin = () => {
    continueAsGuest()
    navigate('/')
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
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting}>
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
