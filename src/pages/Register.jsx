import AuthBrand from '../components/AuthBrand'
import styles from './Register.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'

export default function Register() {
  const navigate = useNavigate()
  const { registerUser } = useAppData()

  const handleSubmit = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    registerUser({
      username: formData.get('username') || 'Username',
      email: formData.get('email') || 'username@example.com',
    })
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
        <button type="submit" className={styles.submitbtn}>
          Sign up
        </button>
      </form>
      <hr className={styles.horizline} data-content="OR" />
      <button className={styles.submitbtn}>Continue with Google</button>
    </div>
  )
}
