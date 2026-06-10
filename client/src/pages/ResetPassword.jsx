import { useState, useEffect } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './ResetPassword.module.css'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordRequest } from '../app/authApi.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 32

export default function ResetPassword() {
  const navigate = useNavigate()
  const { t } = useGlobalHeader()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMessage(t('auth.invalidResetToken'))
    }
  }, [token, t])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!token) {
      setErrorMessage(t('auth.invalidResetToken'))
      return
    }

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!newPassword || !confirmPassword) {
      setErrorMessage(t('auth.bothPasswordsRequired'))
      return
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      setErrorMessage(
        t('auth.passwordLength', {
          min: PASSWORD_MIN_LENGTH,
          max: PASSWORD_MAX_LENGTH,
        }),
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.passwordsNoMatch'))
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const response = await resetPasswordRequest({ token, newPassword })
      setSuccessMessage(response.message || t('auth.passwordResetSuccess'))
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      setErrorMessage(error.message || t('auth.passwordResetError'))
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
        <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#5a2f12' }}>{t('auth.createNewPassword')}</h2>
        <input
          id="newPassword"
          defaultValue=""
          type="password"
          name="newPassword"
          placeholder={t('auth.newPassword')}
          className={styles.textinput}
        />
        <input
          id="confirmPassword"
          defaultValue=""
          type="password"
          name="confirmPassword"
          placeholder={t('auth.confirmPassword')}
          className={styles.textinput}
        />
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        {successMessage && <p style={{ color: 'green', fontSize: '0.95rem', margin: '5px 0', textAlign: 'center' }}>{successMessage} {t('auth.redirecting')}</p>}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting || !token || !!successMessage} style={{ marginTop: '10px' }}>
          {isSubmitting ? t('auth.resettingPassword') : t('auth.resetPassword')}
        </button>
        <Link to="/login" className={styles.signupbtn}>
          {t('auth.backToLogin')}
        </Link>
      </form>
    </div>
  )
}
