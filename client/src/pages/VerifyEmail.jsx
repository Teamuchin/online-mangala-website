import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyEmailRequest } from '../app/authApi.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './Login.module.css' // Reusing some basic styles

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')
  const { isAuthenticated } = useAppData()
  const { t } = useGlobalHeader()

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(t('auth.noToken'))
      return
    }

    const verifyToken = async () => {
      try {
        const response = await verifyEmailRequest({ token })
        setStatus('success')
        setMessage(response.message || t('auth.emailVerifiedSuccess'))
      } catch (error) {
        setStatus('error')
        setMessage(error.message || t('auth.emailVerifiedError'))
      }
    }

    verifyToken()
  }, [token, t])

  return (
    <div className={styles.container}>
      <div className={styles.formdiv} style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2>{t('auth.emailVerification')}</h2>
        {status === 'verifying' && <p>{t('auth.verifyingEmail')}</p>}
        {status === 'success' && (
          <>
            <p style={{ color: 'green', margin: '20px 0' }}>{message}</p>
            <Link to={isAuthenticated ? '/' : '/login'} className={styles.submitbtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
              {isAuthenticated ? t('header.goHome') : t('auth.backToLogin')}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ color: 'red', margin: '20px 0' }}>{message}</p>
            <Link to="/" className={styles.signupbtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
              {t('header.goHome')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
