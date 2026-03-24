import styles from "./Login.module.css"
import { Link } from 'react-router-dom'

export default function Login(){
    function signUp(){
        
    }
    return(
        <div className={styles.container}>
            <div className={styles.labeldiv} >
                <img className={styles.logolabel} src="/logo.svg" alt="websitelogo"></img>
                <h1 className={styles.label}>Mangala</h1>
            </div>
            <form className={styles.formdiv} action={signUp}>
                <input id="usercredential" defaultValue="" type="email" name="usercredential" placeholder="Username or Email" className={styles.textinput} />
                <input id="userpwd" defaultValue="" type="password" name="userpwd" placeholder="password" className={styles.textinput}/>
                <div className={styles.rememberdiv}>
                    <label htmlFor="rememberme">Remember me</label>
                    <input id="rememberme" type="checkbox" defaultChecked={false} name="rememberme"/>
                </div>
                <Link to="/" className={styles.submitbtn}>
                Log in
                </Link>
                <Link to="/register" className={styles.signupbtn}>
                Sign Up
                </Link>
                {/* <input type="submit" value="Log in" className={styles.submitbtn}/> */}
                {/* <input type="button" value="Sign Up" className={styles.signupbtn}/> */}
            </form>
        </div>
    )
}
