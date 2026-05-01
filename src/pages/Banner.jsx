import styles from './Banner.module.css'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'

export default function Banner() {
  const { assets, bannerActions, bannerNavLinks, bannerSloganLines, brandName } = useAppData()

  return (
    <div className={styles.banner}>
      <div className={styles.bannerheader}>
        <div className={styles.headerlogo}>
          <img src={assets.logo} alt="logo" className={styles.logo} />
          <h1>{brandName}</h1>
        </div>
        <div className={styles.headerlinks}>
          {bannerNavLinks.map((linkLabel) => (
            <a key={linkLabel} href="#">
              {linkLabel}
            </a>
          ))}
        </div>
        <div className={styles.headerbuttons}>
          <button className={styles.langbtn}>
            <img src={assets.languageIcon} alt="language" />
          </button>
        </div>
      </div>
      <div className={styles.bannerbody}>
        <div className={styles.bodyslogan}>
          {bannerSloganLines.map((line) => (
            <h1
              key={`${line.accent}-${line.text}`}
              className={line.className ? styles[line.className] : undefined}
            >
              <span className={styles.accentWord}>{line.accent}</span> {line.text}
            </h1>
          ))}
        </div>
        <div className={styles.bodybuttons}>
          {bannerActions.map((action) => (
            <Link key={action.label} to={action.to} className={styles[action.className]}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
