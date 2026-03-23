import styles from "./Register.module.css"
export default function Register(){
    function signUp(){
        
    }
    return(
        <div className={styles.container}>
            <div className={styles.labeldiv} >
                <img className={styles.logolabel} src="/logo.svg" alt="websitelogo"></img>
                <h1 className={styles.label}>Mangala</h1>
            </div>
            <form className={styles.formdiv} action={signUp}>
                <input id="username" defaultValue="" type="text" name="username" placeholder="Username" className={styles.textinput} />
                <input id="email" defaultValue="" type="email" name="email" placeholder="Email" className={styles.textinput} />
                <input id="userpwd" defaultValue="" type="password" name="userpwd" placeholder="Password" className={styles.textinput}/>
                <input id="confirmpwd" defaultValue="" type="password" name="confirmpwd" placeholder="Confirm Password" className={styles.textinput}/>
                <input type="submit" value="Sign Up" className={styles.submitbtn}/>
            </form>
            <hr className={styles.horizline} data-content = "OR"></hr>
            <button className={styles.submitbtn}>Continue with Google</button>
        </div>
    )
}
