import styles from './AccountSettings.module.css'
import { ACCOUNT_SETTINGS_FIELDS } from './pageContent'

export default function AccountSettings() {
  return (
    <div className={styles.accountsettings}>
      <h1>Account Settings</h1>
      <form className={styles.infochangediv}>
        <div className={styles.nonButtonInput}>
          {ACCOUNT_SETTINGS_FIELDS.map((field) => (
            <input
              key={field.id}
              id={field.id}
              defaultValue=""
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              className={styles[field.className]}
            />
          ))}
          <div className={styles.profilePictureInput}>
            <img
              src="/assets/profile-picture-placeholder.png"
              alt="Profile Picture"
              className={styles.profilePicturePreview}
            />
            <input
              id="profilePicture"
              defaultValue=""
              type="file"
              name="profilePicture"
              placeholder="Profile Picture"
              className={styles.textinput}
              accept="image/*"
            />
          </div>
        </div>
        <input type="submit" value="Save Changes" className={styles.submitbtn} />
      </form>
    </div>
  )
}
