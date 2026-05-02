import { useEffect, useState } from 'react'
import {
  buildAccountFormState,
  buildProfileUpdatesFromForm,
  isGuestUser,
} from '../app/appState.js'
import { Navigate } from 'react-router-dom'
import PageBackLink from '../components/PageBackLink.jsx'
import styles from './AccountSettings.module.css'
import { useAppData } from '../app/useAppData.js'

export default function AccountSettings() {
  const { accountSettingsFields, assets, currentUser, updateCurrentUser } = useAppData()
  const [formState, setFormState] = useState(() => buildAccountFormState(currentUser))
  const [saveMessage, setSaveMessage] = useState('')
  const guestMode = isGuestUser(currentUser)

  useEffect(() => {
    setFormState(buildAccountFormState(currentUser))
  }, [currentUser])

  const handleFieldChange = (event) => {
    const { id, value, files, type } = event.target
    setSaveMessage('')

    setFormState((currentFormState) => ({
      ...currentFormState,
      [id]: type === 'file' ? files?.[0] ?? null : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    updateCurrentUser(buildProfileUpdatesFromForm(formState))
    setFormState((currentFormState) => ({
      ...currentFormState,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      profilePicture: null,
    }))
    setSaveMessage('Profile details saved.')
  }

  if (guestMode) {
    return <Navigate to="/" replace />
  }

  return (
    <div className={styles.accountsettings}>
      <div className={styles.topBar}>
        <PageBackLink />
      </div>
      <h1>Account Settings</h1>
      <form className={styles.infochangediv} onSubmit={handleSubmit}>
        {saveMessage && <p className={styles.saveMessage}>{saveMessage}</p>}
        <div className={styles.nonButtonInput}>
          {accountSettingsFields.map((field) => (
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
          <div className={styles.profilePictureInput}>
            <img
              src={currentUser.profilePicture || assets.profilePicturePlaceholder}
              alt="Profile Picture"
              className={styles.profilePicturePreview}
            />
            <input
              id="profilePicture"
              type="file"
              name="profilePicture"
              placeholder="Profile Picture"
              className={styles.textinput}
              accept="image/*"
              onChange={handleFieldChange}
            />
          </div>
        </div>
        <input type="submit" value="Save Changes" className={styles.submitbtn} />
      </form>
    </div>
  )
}
