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
                    <div>
                        <Link to="/login" className={styles.account}>
                        <img src="/accountbtn.svg" alt="account"/>
                        </Link>
                    </div>
                    <button className={styles.langbtn}><img src="/languagebtn.svg" alt="language"/></button>
                    <button className={styles.settingbtn}><img src="/settingsbtn.png" alt="settings"/></button>
                </div>
            </div>
            <div className={styles.homebody}>
                <h1>Welcome Username!</h1>
                <div className={styles.homebuttons}>
                    <div className={styles.homebuttonupper}>
                        <Link to="/game/local" className={styles.localbtn}>
                        Local Match
                        </Link>
                        <Link to="/game/local" className={styles.offlinebtn}>
                        Play Againist Bots
                        </Link>
                    </div>
                    <div className={styles.homebuttonlower}>
                        <Link to="/game/local" className={styles.learnbtn}>
                        Learn & Train
                        </Link>
                        <Link to="/game/local" className={styles.watchbtn}>
                        Watch Others
                        </Link>
                        <Link to="/game/local" className={styles.communitybtn}>
                        Community
                        </Link>
                    </div>
                    <img src="/decorationboard.png" alt="decorationboard" className={styles.decorationboard}/>
                </div>
            </div>
        </div>
    )
}
