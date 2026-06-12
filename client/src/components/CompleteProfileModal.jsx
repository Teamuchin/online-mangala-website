import { useState } from 'react'
import { useAppData } from '../app/useAppData'
import { useGlobalHeader } from '../app/useGlobalHeader'
import { completeProfileRequest } from '../app/authApi'
import styles from './CompleteProfileModal.module.css'

export default function CompleteProfileModal() {
  const { currentUser, logIn } = useAppData()
  const { t } = useGlobalHeader()
  const [username, setUsername] = useState(currentUser?.username || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!currentUser || !currentUser.needs_username_setup) {
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) return

    try {
      setIsSubmitting(true)
      setError('')
      const token = window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')
      
      const response = await completeProfileRequest({ username }, token)
      if (response.token) {
        if (window.localStorage.getItem('mangala.authToken')) {
          window.localStorage.setItem('mangala.authToken', response.token)
        } else {
          window.sessionStorage.setItem('mangala.authToken', response.token)
        }
      }
      logIn(response.user)
    } catch (err) {
      setError(err.message || 'Failed to update username')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{t('auth.completeProfileTitle') || 'Complete Your Profile'}</h2>
        <p className={styles.description}>
          {t('auth.completeProfileDesc') || 'Please choose a username for yourself. You can change this later.'}
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('auth.username')}
            required
            minLength={3}
            maxLength={15}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? (t('auth.completingProfile') || 'Saving...') : (t('auth.completeProfileSubmit') || 'Save and Start')}
          </button>
        </form>
      </div>
    </div>
  )
}
