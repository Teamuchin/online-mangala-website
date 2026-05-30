import { useState } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './Login.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { loginRequest } from '../app/authApi.js'

export default function Login() {
  const navigate = useNavigate()
  const { continueAsGuest, logIn } = useAppData()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const credential = String(formData.get('usercredential') || '').trim()
    const password = String(formData.get('userpwd') || '')

    if (!credential || !password) {
      setErrorMessage('Please enter your email/username and password.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      const response = await loginRequest({
        email: credential,
        password,
      })

      window.localStorage.setItem('mangala.authToken', response.token)
      logIn(response.user)

      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
          type="text"
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
        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log in'}
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
