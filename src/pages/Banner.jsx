import styles from "./Banner.module.css"
import { Link } from 'react-router-dom'

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
                        <button className={styles.langbtn}><img src="/languagebtn.svg" alt="language"/></button>
                    </div>
                </div>
                <div className={styles.bannerbody}>
                    <div className={styles.bodyslogan}>
                        <h1><span style={{color: "#5a2f12"}}>Play</span> Mangala</h1>
                        <h1 style={{marginLeft: "150px"}} ><span style={{color: "#5a2f12"}}>Wherever</span> you like</h1>
                        <h1><span style={{color: "#5a2f12"}}>However</span> you want</h1>
                    </div>
                    <div className={styles.bodybuttons}>
                        <Link to="/login" className={styles.loginbtn}>Log in</Link>
                        <Link to="/register" className={styles.signupbtn}>Sign up</Link>
                        <Link to="/register" className={styles.signupbtn}>Play as Guest</Link>
                    </div>
                </div>
            </div>
    )
}
