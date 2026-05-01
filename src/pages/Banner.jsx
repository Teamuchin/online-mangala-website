import styles from './Banner.module.css'
import { Link } from 'react-router-dom'
import { BANNER_NAV_LINKS, BANNER_SLOGAN_LINES } from './pageContent'

export default function Banner() {
  return (
    <div className={styles.banner}>
      <div className={styles.bannerheader}>
        <div className={styles.headerlogo}>
          <img src="/logo.svg" alt="logo" className={styles.logo} />
          <h1>Mangala</h1>
        </div>
        <div className={styles.headerlinks}>
          {BANNER_NAV_LINKS.map((linkLabel) => (
            <a key={linkLabel} href="#">
              {linkLabel}
            </a>
          ))}
        </div>
        <div className={styles.headerbuttons}>
          <button className={styles.langbtn}>
            <img src="/languagebtn.svg" alt="language" />
          </button>
        </div>
      </div>
      <div className={styles.bannerbody}>
        <div className={styles.bodyslogan}>
          {BANNER_SLOGAN_LINES.map((line) => (
            <h1
              key={`${line.accent}-${line.text}`}
              className={line.className ? styles[line.className] : undefined}
            >
              <span className={styles.accentWord}>{line.accent}</span> {line.text}
            </h1>
          ))}
        </div>
        <div className={styles.bodybuttons}>
          <Link to="/login" className={styles.loginbtn}>
            Log in
          </Link>
          <Link to="/register" className={styles.signupbtn}>
            Sign up
          </Link>
          <Link to="/register" className={styles.signupbtn}>
            Play as Guest
          </Link>
        </div>
      </div>
    </div>
  )
}
