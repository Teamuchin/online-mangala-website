import { useState } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './ForgotPassword.module.css'
import { Link } from 'react-router-dom'
import { forgotPasswordRequest } from '../app/authApi.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

export default function ForgotPassword() {
  const { t } = useGlobalHeader()
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '').trim()

    if (!email) {
      setErrorMessage(t('auth.loginMissing') || 'Email is required')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const response = await forgotPasswordRequest({ email })
      setSuccessMessage(response.message || t('auth.forgotPasswordSuccess'))
    } catch (error) {
      setErrorMessage(error.message || t('auth.forgotPasswordError'))
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
        <p style={{ textAlign: 'center', marginBottom: '10px', color: 'rgba(75, 41, 19, 0.84)' }}>
          {t('auth.forgotPasswordDesc')}
        </p>
        <input
          id="email"
          defaultValue=""
          type="email"
          name="email"
          placeholder={t('auth.email')}
          className={styles.textinput}
        />
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        {successMessage && <p style={{ color: 'green', fontSize: '0.95rem', margin: '5px 0', textAlign: 'center' }}>{successMessage}</p>}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting || !!successMessage} style={{ marginTop: '10px' }}>
          {isSubmitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
        </button>
        <Link to="/login" className={styles.signupbtn}>
          {t('auth.backToLogin')}
        </Link>
      </form>
    </div>
  )
}
