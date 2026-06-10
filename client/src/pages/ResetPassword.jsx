import { useState, useEffect } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './ResetPassword.module.css'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordRequest } from '../app/authApi.js'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid or missing reset token.')
    }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!token) {
      setErrorMessage('Invalid or missing reset token.')
      return
    }

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Both password fields are required.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const response = await resetPasswordRequest({ token, newPassword })
      setSuccessMessage(response.message || 'Password has been reset successfully.')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      setErrorMessage(error.message || 'Failed to reset password.')
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
        <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#5a2f12' }}>Create New Password</h2>
        <input
          id="newPassword"
          defaultValue=""
          type="password"
          name="newPassword"
          placeholder="New Password"
          className={styles.textinput}
        />
        <input
          id="confirmPassword"
          defaultValue=""
          type="password"
          name="confirmPassword"
          placeholder="Confirm New Password"
          className={styles.textinput}
        />
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        {successMessage && <p style={{ color: 'green', fontSize: '0.95rem', margin: '5px 0', textAlign: 'center' }}>{successMessage} Redirecting...</p>}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting || !token || !!successMessage} style={{ marginTop: '10px' }}>
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
        <Link to="/login" className={styles.signupbtn}>
          Back to Login
        </Link>
      </form>
    </div>
  )
}
