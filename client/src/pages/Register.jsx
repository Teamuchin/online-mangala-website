import { useState } from 'react'
import AuthBrand from '../components/AuthBrand.jsx'
import styles from './Register.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { registerRequest } from '../app/authApi.js'

const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,15}$/
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 32

function formatMemberSince(isoDateString) {
  const parsedDate = new Date(isoDateString)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'May 2026'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

export default function Register() {
  const navigate = useNavigate()
  const { registerUser } = useAppData()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const username = String(formData.get('username') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('userpwd') || '')
    const confirmPassword = String(formData.get('confirmpwd') || '')

    if (!username || !email || !password) {
      setErrorMessage('Please fill in username, email, and password.')
      return
    }

    if (!USERNAME_REGEX.test(username)) {
      setErrorMessage(
        'Username must be 3-15 characters and use only letters, numbers, underscores, or hyphens.',
      )
      return
    }

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      setErrorMessage(`Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long.`)
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      const response = await registerRequest({
        username,
        email,
        password,
      })

      window.localStorage.setItem('mangala.authToken', response.token)

      registerUser({
        id: String(response.user.id),
        username: response.user.username,
        email: response.user.email,
        memberSince: formatMemberSince(response.user.created_at),
      })
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
        {errorMessage ? <p>{errorMessage}</p> : null}
        <button type="submit" className={styles.submitbtn} disabled={isSubmitting}>
          {isSubmitting ? 'Signing up...' : 'Sign up'}
        </button>
      </form>
      <hr className={styles.horizline} data-content="OR" />
      <button className={styles.submitbtn}>Continue with Google</button>
      <Link to="/login" className={styles.submitbtn}>
        Back to Login
      </Link>
    </div>
  )
}
