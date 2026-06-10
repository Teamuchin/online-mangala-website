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
      setSuccessMessage(response.message || 'If your email is registered, a password reset link has been sent.')
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send password reset email')
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
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <input
          id="email"
          defaultValue=""
          type="email"
          name="email"
          placeholder="Email address"
          className={styles.textinput}
        />
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        {successMessage && <p style={{ color: 'green', fontSize: '0.95rem', margin: '5px 0', textAlign: 'center' }}>{successMessage}</p>}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting} style={{ marginTop: '10px' }}>
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </button>
        <Link to="/login" className={styles.signupbtn}>
          Back to Login
        </Link>
      </form>
    </div>
  )
}
