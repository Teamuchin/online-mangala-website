import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildWelcomeMessage } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import styles from './Home.module.css'

export default function Home() {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const {
    assets,
    brandName,
    currentUser,
    homePrimaryActions,
    homeSecondaryActions,
  } = useAppData()

  return (
    <div className={styles.home}>
      <div className={styles.homeheader}>
        <div className={styles.headerlogo}>
          <img src={assets.logo} alt="logo" className={styles.logo} />
          <h1>{brandName}</h1>
        </div>
        <div className={styles.headerbuttons}>
          <div
            className={styles.accountWrapper}
            onMouseEnter={() => setIsAccountModalOpen(true)}
            onMouseLeave={() => setIsAccountModalOpen(false)}
          >
            <Link to="/account" className={styles.account}>
              <img src={assets.accountIcon} alt="account" />
            </Link>
            {isAccountModalOpen && (
              <div className={styles.accountModal}>
                <img
                  src={assets.accountIcon}
                  alt="profilepic"
                  className={styles.accountModalIcon}
                />
                <p className={styles.accountModalUsername}>{currentUser.username}</p>
                <p className={styles.accountModalElo}>Elo: {currentUser.elo}</p>
                <Link to="/login" className={styles.modallogout}>
                  Log out
                </Link>
              </div>
            )}
          </div>
          <button className={styles.langbtn}>
            <img src={assets.languageIcon} alt="language" />
          </button>
          <button className={styles.settingbtn}>
            <img src={assets.settingsIcon} alt="settings" />
          </button>
        </div>
      </div>
      <div className={styles.homebody}>
        <h1>{buildWelcomeMessage(currentUser)}</h1>
        <div className={styles.homebuttons}>
          <div className={styles.homebuttonupper}>
            {homePrimaryActions.map((action) => (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {action.label}
              </Link>
            ))}
          </div>
          <div className={styles.homebuttonlower}>
            {homeSecondaryActions.map((action) => (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {action.label}
              </Link>
            ))}
          </div>
          <img
            src={assets.decorationBoard}
            alt="decorationboard"
            className={styles.decorationboard}
          />
        </div>
      </div>
    </div>
  )
}
