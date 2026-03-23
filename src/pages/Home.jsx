import styles from "./Home.module.css"
import { Link } from 'react-router-dom'

export default function Home(){
    return(
        <div className={styles.home}>
            <div className={styles.homeheader}>
                <div className={styles.headerlogo}>
                    <img src="/logo.svg" alt="logo" className={styles.logo}/>
                    <h1>Mangala</h1>
                </div>
                <div className={styles.headerbuttons}>
                    <button className={styles.accountbtn}><img src="/accountbtn.svg" alt="account"/></button>
                    <button className={styles.langbtn}><img src="/languagebtn.svg" alt="language"/></button>
                    <button className={styles.settingbtn}><img src="/settingsbtn.png" alt="settings"/></button>
                </div>
            </div>
            <div className={styles.homebody}>
                <h1>Welcome Username!</h1>
                <div className={styles.homebuttons}>
                    <div className={styles.homebuttonupper}>
                        <Link to="/game/local" className={`${styles.primaryLink} ${styles.primaryAction}`}>
                            Local Match
                        </Link>
                        <button className={styles.learnbtn}>Play Againist Bots</button>
                    </div>
                    <div className={styles.homebuttonlower}>
                        <button className={styles.historybtn}>Learn & Train</button>
                        <button className={styles.friendsbtn}>Watch Others</button>
                        <button className={styles.aboutbtn}>Community</button>
                    </div>
                    <img src="/decorationboard.png" alt="decorationboard" className={styles.decorationboard}/>
                </div>
            </div>
        </div>
    )
}
