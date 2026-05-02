import AuthBrand from '../components/AuthBrand'
import styles from './Login.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'

export default function Login() {
  const navigate = useNavigate()
  const { continueAsGuest, logIn } = useAppData()

  const handleSubmit = (event) => {
    event.preventDefault()
    logIn()
    navigate('/')
  }

  const handleGuestLogin = () => {
    continueAsGuest()
    navigate('/')
  }

  return (
    <div className={styles.container}>
      <AuthBrand
        wrapperClassName={styles.labeldiv}
        logoClassName={styles.logolabel}
        titleClassName={styles.label}
      />
      <form className={styles.formdiv} onSubmit={handleSubmit}>
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
        <button type="submit" className={styles.submitbtn}>
          Log in
        </button>
        <Link to="/register" className={styles.signupbtn}>
          Sign Up
        </Link>
        <button type="button" className={styles.signupbtn} onClick={handleGuestLogin}>
          Play as Guest
        </button>
      </form>
    </div>
  )
}
