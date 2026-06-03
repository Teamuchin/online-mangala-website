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
import { useGlobalHeader } from '../app/useGlobalHeader.js'

const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,15}$/

export default function AccountSettings() {
  const { accountSettingsFields, currentUser, logOut, updateCurrentUser } = useAppData()
  const { t } = useGlobalHeader()
  const [formState, setFormState] = useState(() => buildAccountFormState(currentUser))
  const [saveMessage, setSaveMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const guestMode = isGuestUser(currentUser)
  const usernameField = accountSettingsFields.find((field) => field.id === 'username')
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

      const token = window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')

      if (!token) {
        setErrorMessage(t('account.pleaseLogInAgain'))
        return
      }

      if (!String(formState.currentPassword || '').trim()) {
        setErrorMessage(t('account.enterPasswordFirst'))
        return
      }

      const requestedUsername = String(formState.username || '').trim()

      if (!USERNAME_REGEX.test(requestedUsername)) {
        setErrorMessage(t('account.usernameRules'))
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
      updateCurrentUser(response.user)

      setFormState((currentFormState) => ({
        ...currentFormState,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      setSaveMessage(response.message || t('account.changesSaved'))
    } catch (error) {
      if (
        error.message === 'Unauthorized' ||
        error.message === 'Invalid or expired token' ||
        error.message === 'Invalid token payload'
      ) {
        logOut()
        setErrorMessage(t('account.sessionExpired'))
      } else {
        setErrorMessage(error.message || t('account.updateFailed'))
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
      <h1>{t('account.title')}</h1>
      <form className={styles.infochangediv} onSubmit={handleSubmit}>
        {saveMessage && <p className={styles.saveMessage}>{saveMessage}</p>}
        {errorMessage && <p className={styles.saveMessage}>{errorMessage}</p>}
        <div className={styles.nonButtonInput}>
          <div className={styles.readOnlyGroup}>
            {usernameField && (
              <label className={styles.editableField} htmlFor={usernameField.id}>
                <span className={styles.readOnlyLabel}>{t('account.username')}</span>
                <input
                  id={usernameField.id}
                  value={formState.username}
                  type={usernameField.type}
                  name={usernameField.name}
                  placeholder={t('account.username')}
                  className={styles[usernameField.className]}
                  onChange={handleFieldChange}
                  autoComplete="username"
                />
              </label>
            )}
            <div className={styles.readOnlyField}>
              <span className={styles.readOnlyLabel}>{t('account.email')}</span>
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
              placeholder={
                field.id === 'currentPassword'
                  ? t('account.currentPassword')
                  : field.id === 'newPassword'
                    ? t('account.newPassword')
                    : t('account.confirmNewPassword')
              }
              className={styles[field.className]}
              onChange={handleFieldChange}
            />
          ))}
        </div>
        <input
          type="submit"
          value={isSubmitting ? t('account.saving') : t('account.saveChanges')}
          className={styles.submitbtn}
          disabled={isSubmitting}
        />
      </form>
    </div>
  )
}
