import styles from "./Login.module.css"
export default function Login(){
    function signUp(loginData){
        
    }
    return(
        <div className={styles.container}>
            <div className={styles.labeldiv} >
                <img className={styles.logolabel} src="../public/logo.svg" alt="websitelogo"></img>
                <h1 className={styles.label}>Mangala</h1>
            </div>
            <form className={styles.formdiv} action={signUp}>
                <input id="usercredential" defaultValue="" type="email" name="usercredential" placeholder="Username or Email" className={styles.textinput} />
                <input id="userpwd" defaultValue="" type="password" name="userpwd" placeholder="password" className={styles.textinput}/>
                <div className={styles.rememberdiv}>
                    <label htmlFor="rememberme">Remember me</label>
                    <input id="rememberme" type="checkbox" defaultChecked={false} name="rememberme"/>
                </div>
                <input type="submit" value="Log in" className={styles.submitbtn}/>
                <input type="button" value="Sign Up" className={styles.signupbtn}/>
            </form>
        </div>
    )
}

