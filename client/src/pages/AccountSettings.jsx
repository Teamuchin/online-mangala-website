import { useEffect, useState } from 'react'
import {
  buildAccountFormState,
  buildProfileUpdatesFromForm,
  isGuestUser,
} from '../app/appState.js'
import { Navigate } from 'react-router-dom'
import styles from './AccountSettings.module.css'
import { useAppData } from '../app/useAppData.js'
import { updateMeRequest } from '../app/authApi.js'

function formatMemberSince(isoDateString) {
  const parsedDate = new Date(isoDateString)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'May 2026'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

export default function AccountSettings() {
  const { accountSettingsFields, currentUser, updateCurrentUser } = useAppData()
  const [formState, setFormState] = useState(() => buildAccountFormState(currentUser))
  const [saveMessage, setSaveMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const guestMode = isGuestUser(currentUser)
  const passwordFields = accountSettingsFields.filter(
    (field) => field.id !== 'username' && field.id !== 'email',
  )

  useEffect(() => {
    setFormState(buildAccountFormState(currentUser))
  }, [currentUser])

  const handleFieldChange = (event) => {
    const { id, value } = event.target
    setSaveMessage('')
    setErrorMessage('')

    setFormState((currentFormState) => ({
      ...currentFormState,
      [id]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaveMessage('')
    setErrorMessage('')

    try {
      setIsSubmitting(true)

      const token = window.localStorage.getItem('mangala.authToken')

      if (!token) {
        setErrorMessage('Please log in again to update your account.')
        return
      }

      if (!String(formState.currentPassword || '').trim()) {
        setErrorMessage('Enter your password first.')
        return
      }

      const payload = {
        ...buildProfileUpdatesFromForm(formState),
        currentPassword: formState.currentPassword,
        newPassword: formState.newPassword,
        confirmPassword: formState.confirmPassword,
      }

      const response = await updateMeRequest(payload, token)

      window.localStorage.setItem('mangala.authToken', response.token)

      updateCurrentUser({
        id: String(response.user.id),
        username: response.user.username,
        email: response.user.email,
        memberSince: formatMemberSince(response.user.created_at),
      })

      setFormState((currentFormState) => ({
        ...currentFormState,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      setSaveMessage(response.message || 'Changes saved.')
    } catch (error) {
      if (
        error.message === 'Unauthorized' ||
        error.message === 'Invalid or expired token' ||
        error.message === 'Invalid token payload'
      ) {
        window.localStorage.removeItem('mangala.authToken')
        setErrorMessage('Session expired. Please log out and log in again, then retry.')
      } else {
        setErrorMessage(error.message || 'Could not update account settings.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (guestMode) {
    return <Navigate to="/" replace />
  }

  return (
    <div className={styles.accountsettings}>
      <h1>Account Settings</h1>
      <form className={styles.infochangediv} onSubmit={handleSubmit}>
        {saveMessage && <p className={styles.saveMessage}>{saveMessage}</p>}
        {errorMessage && <p className={styles.saveMessage}>{errorMessage}</p>}
        <div className={styles.nonButtonInput}>
          <div className={styles.readOnlyGroup}>
            <div className={styles.readOnlyField}>
              <span className={styles.readOnlyLabel}>Username</span>
              <span className={styles.readOnlyValue}>{currentUser.username}</span>
            </div>
            <div className={styles.readOnlyField}>
              <span className={styles.readOnlyLabel}>Email</span>
              <span className={styles.readOnlyValue}>{currentUser.email}</span>
            </div>
          </div>
          {passwordFields.map((field) => (
            <input
              key={field.id}
              id={field.id}
              value={formState[field.id]}
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              className={styles[field.className]}
              onChange={handleFieldChange}
            />
          ))}
        </div>
        <input
          type="submit"
          value={isSubmitting ? 'Saving...' : 'Save Changes'}
          className={styles.submitbtn}
          disabled={isSubmitting}
        />
      </form>
    </div>
  )
}
