import styles from "./Home.module.css"
export default function Home(){
    return(
        <div className={styles.home}>
            <div className={styles.homeheader}>
                <div className={styles.headerlogo}>
                    <img src="../public/logo.svg" alt="logo" className={styles.logo}/>
                    <h1>Mangala</h1>
                </div>
                <div className={styles.headerbuttons}>
                    <button className={styles.accountbtn}><img src="../public/accountbtn.svg" alt="account"/></button>
                    <button className={styles.langbtn}><img src="../public/languagebtn.svg" alt="language"/></button>
                    <button className={styles.settingbtn}><img src="../public/settingsbtn.png" alt="settings"/></button>
                </div>
            </div>
            <div className={styles.homebody}>
                <h1>Welcome Username!</h1>
                <div className={styles.homebuttons}>
                    <div className={styles.homebuttonupper}>
                        <button className={styles.playbtn}>Play Online</button>
                        <button className={styles.learnbtn}>Play Againist Bots</button>
                    </div>
                    <div className={styles.homebuttonlower}>
                        <button className={styles.historybtn}>Learn & Train</button>
                        <button className={styles.friendsbtn}>Watch Others</button>
                        <button className={styles.aboutbtn}>Community</button>
                    </div>
                    <img src="../public/decorationboard.png" alt="decorationboard" className={styles.decorationboard}/>
                </div>
            </div>
        </div>
    )
}