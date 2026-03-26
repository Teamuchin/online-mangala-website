import styles from "./AccountSettings.module.css"

export default function AccountSettings(){


    return(
            <div className={styles.accountsettings}>
                <h1>Account Settings</h1>
                <form className={styles.infochangediv}>
                    <input id="username" defaultValue="" type="text" name="usercredential" placeholder="Username" className={styles.textinput} />
                    <input id="email" defaultValue="" type="email" name="usercredential" placeholder="Email" className={styles.textinput} />
                    <input id="password" defaultValue="" type="password" name="userpwd" placeholder="password" className={styles.textinput}/>
                    <input id="confirmPassword" defaultValue="" type="password" name="confirmUserpwd" placeholder="Confirm Password" className={styles.textinput}/>
                    <input type="submit" value="Save Changes" className={styles.submitbtn}/> 
                </form>
            </div>
    )
}
