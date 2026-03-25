import styles from "./Banner.module.css"

export default function Banner(){


    return(
            <div className={styles.banner}>
                <div className={styles.bannerheader}>
                    <div className={styles.headerlogo}>
                        <img src="/logo.svg" alt="logo" className={styles.logo}/>
                        <h1>Mangala</h1>
                    </div>
                    <div className={styles.headerlinks}>
                        <a href="#">Play</a>
                        <a href="#">Learn</a>
                        <a href="#">About</a>
                    </div>
                    <div className={styles.headerbuttons}>
                        <button className={styles.accountbtn}><img src="/accountbtn.svg" alt="account"/></button>
                        <button className={styles.langbtn}><img src="/languagebtn.svg" alt="language"/></button>
                        <button className={styles.settingbtn}><img src="/settingsbtn.png" alt="settings"/></button>
                    </div>
                </div>
                <div className={styles.bannerbody}>
                    <div className={styles.bodyslogan}>
                        <h1><span style={{color: "#5a2f12"}}>Play</span> Mangala</h1>
                        <h1 style={{marginLeft: "150px"}} ><span style={{color: "#5a2f12"}}>Wherever</span> you like</h1>
                        <h1><span style={{color: "#5a2f12"}}>However</span> you want</h1>
                    </div>
                    <div className={styles.bodybuttons}>
                        <button className={styles.loginbtn}>Log in</button>
                        <button className={styles.signupbtn}>Sign up</button>
                        <button className={styles.guestbtn}>Play as guest</button>
                    </div>
                </div>
            </div>
    )
}
