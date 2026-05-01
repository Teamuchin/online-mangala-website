import AuthBrand from '../components/AuthBrand'
import styles from './Login.module.css'
import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <div className={styles.container}>
      <AuthBrand
        wrapperClassName={styles.labeldiv}
        logoClassName={styles.logolabel}
        titleClassName={styles.label}
      />
      <form className={styles.formdiv}>
        <input
          id="usercredential"
          defaultValue=""
          type="email"
          name="usercredential"
          placeholder="Username or Email"
          className={styles.textinput}
        />
        <input
          id="userpwd"
          defaultValue=""
          type="password"
          name="userpwd"
          placeholder="password"
          className={styles.textinput}
        />
        <div className={styles.rememberdiv}>
          <label htmlFor="rememberme">Remember me</label>
          <input
            id="rememberme"
            type="checkbox"
            defaultChecked={false}
            name="rememberme"
          />
        </div>
        <Link to="/" className={styles.submitbtn}>
          Log in
        </Link>
        <Link to="/register" className={styles.signupbtn}>
          Sign Up
        </Link>
      </form>
    </div>
  )
}
