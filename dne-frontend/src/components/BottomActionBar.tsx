import {Link} from "wouter";
import styles from "./BottomActionBar.module.css";

const BottomNavbar = () => (
    <div className={styles.navbar}>
        <Link to="/portfolio" className={styles.item}>Portfolio</Link>
        <Link to="/wallet" className={styles.item}>Wallet</Link>
        <Link to="/pools" className={styles.item}>Settings</Link>
        <Link to="/liquidity" className={styles.item}>Liquidity</Link>
        <Link to="/swap" className={styles.item}>Swap</Link>
    </div>
);

export {BottomNavbar};