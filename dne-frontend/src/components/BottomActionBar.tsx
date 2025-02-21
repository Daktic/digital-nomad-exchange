import {Link} from "wouter";
import styles from "./BottomActionBar.module.css";
import {PortfolioIcon} from "../assets/button_bar/Portfolio.tsx";

const BottomNavbar = () => (
    <div className={styles.navbar}>
        <Link to="/portfolio" className={styles.item}>
                <PortfolioIcon />
        </Link>
        <Link to="/swap" className={styles.item}>Swap</Link>
        <Link to="/pools" className={styles.item}>Settings</Link>
        <Link to="/liquidity" className={styles.item}>Liquidity</Link>
        <Link to="/wallet" className={styles.item}>Wallet</Link>



    </div>
);

export {BottomNavbar};