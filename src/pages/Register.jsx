import AuthBrand from '../components/AuthBrand'
import styles from './Register.module.css'
import { Link } from 'react-router-dom'

export default function Register() {
  return (
    <div className={styles.container}>
      <AuthBrand
        wrapperClassName={styles.labeldiv}
        logoClassName={styles.logolabel}
        titleClassName={styles.label}
      />
      <form className={styles.formdiv}>
        <input
          id="username"
          defaultValue=""
          type="text"
          name="username"
          placeholder="Username"
          className={styles.textinput}
        />
        <input
          id="email"
          defaultValue=""
          type="email"
          name="email"
          placeholder="Email"
          className={styles.textinput}
        />
        <input
          id="userpwd"
          defaultValue=""
          type="password"
          name="userpwd"
          placeholder="Password"
          className={styles.textinput}
        />
        <input
          id="confirmpwd"
          defaultValue=""
          type="password"
          name="confirmpwd"
          placeholder="Confirm Password"
          className={styles.textinput}
        />
        <Link to="/" className={styles.submitbtn}>
          Sign up
        </Link>
      </form>
      <hr className={styles.horizline} data-content="OR" />
      <button className={styles.submitbtn}>Continue with Google</button>
    </div>
  )
}
