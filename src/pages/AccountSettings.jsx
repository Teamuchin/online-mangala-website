import styles from "./AccountSettings.module.css"

export default function AccountSettings(){


    return(
            <div className={styles.accountsettings}>
                <h1>Account Settings</h1>
                <form className={styles.infochangediv}>
                    <div className={styles.nonButtonInput}>
                        <input id="username" defaultValue="" type="text" name="usercredential" placeholder="Username" className={styles.textinput} />
                        <input id="email" defaultValue="" type="email" name="usercredential" placeholder="Email" className={styles.textinput} />
                        <input id="currentPassword" defaultValue="" type="password" name="userpwd" placeholder="Current Password" className={styles.textinput}/>
                        <input id="newPassword" defaultValue="" type="password" name="newUserpwd" placeholder="New Password" className={styles.textinput}/>
                        <input id="confirmPassword" defaultValue="" type="password" name="confirmUserpwd" placeholder="Confirm New Password" className={styles.textinput}/>
                        <input id="bio" defaultValue="" type="text" name="bio" placeholder="Bio" className={styles.bioinput}/>
                        <div className={styles.profilePictureInput}>
                            <img src="/assets/profile-picture-placeholder.png" alt="Profile Picture" className={styles.profilePicturePreview}/>
                            <input id="profilePicture" defaultValue="" type="file" name="profilePicture" placeholder="Profile Picture" className={styles.textinput} accept="image/*"/>
                        </div>
                    </div>
                    <input type="submit" value="Save Changes" className={styles.submitbtn}/> 
                </form>
            </div>
    )
}
