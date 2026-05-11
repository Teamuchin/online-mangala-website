import { Link } from 'react-router-dom'
import styles from './PageBackLink.module.css'

export default function PageBackLink({
  to = '/',
  label = 'Back Home',
  className = '',
}) {
  return (
    <Link
      to={to}
      className={`${styles.backLink} ${className}`.trim()}
    >
      {label}
    </Link>
  )
}
