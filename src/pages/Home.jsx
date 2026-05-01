import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Home.module.css'
import {
  HOME_ACCOUNT_SUMMARY,
  HOME_PRIMARY_ACTIONS,
  HOME_SECONDARY_ACTIONS,
} from './pageContent'

export default function Home() {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  return (
    <div className={styles.home}>
      <div className={styles.homeheader}>
        <div className={styles.headerlogo}>
          <img src="/logo.svg" alt="logo" className={styles.logo} />
          <h1>Mangala</h1>
        </div>
        <div className={styles.headerbuttons}>
          <div
            className={styles.accountWrapper}
            onMouseEnter={() => setIsAccountModalOpen(true)}
            onMouseLeave={() => setIsAccountModalOpen(false)}
          >
            <Link to="/account" className={styles.account}>
              <img src="/accountbtn.svg" alt="account" />
            </Link>
            {isAccountModalOpen && (
              <div className={styles.accountModal}>
                <img
                  src="/accountbtn.svg"
                  alt="profilepic"
                  className={styles.accountModalIcon}
                />
                <p className={styles.accountModalUsername}>
                  {HOME_ACCOUNT_SUMMARY.username}
                </p>
                <p className={styles.accountModalElo}>
                  {HOME_ACCOUNT_SUMMARY.eloLabel}
                </p>
                <Link to="/login" className={styles.modallogout}>
                  Log out
                </Link>
              </div>
            )}
          </div>
          <button className={styles.langbtn}>
            <img src="/languagebtn.svg" alt="language" />
          </button>
          <button className={styles.settingbtn}>
            <img src="/settingsbtn.png" alt="settings" />
          </button>
        </div>
      </div>
      <div className={styles.homebody}>
        <h1>Welcome Username!</h1>
        <div className={styles.homebuttons}>
          <div className={styles.homebuttonupper}>
            {HOME_PRIMARY_ACTIONS.map((action) => (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {action.label}
              </Link>
            ))}
          </div>
          <div className={styles.homebuttonlower}>
            {HOME_SECONDARY_ACTIONS.map((action) => (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {action.label}
              </Link>
            ))}
          </div>
          <img
            src="/decorationboard.png"
            alt="decorationboard"
            className={styles.decorationboard}
          />
        </div>
      </div>
    </div>
  )
}
