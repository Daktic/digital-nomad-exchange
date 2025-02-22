import {Link} from "wouter";
import styles from "./BottomActionBar.module.css";
import {PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon} from "./ButtonBarIcons.tsx";

const BottomNavbar = () => (
    <div className={styles.navbar}>
        <Link to="/portfolio" className={styles.item}>
                <PortfolioIcon />
        </Link>
        <Link to="/swap" className={styles.item}>
                <SwapIcon />
        </Link>
        <Link to="/pools" className={styles.item}>
                <SupplyIcon />
        </Link>
        <Link to="/wallet" className={styles.item}>
                <WalletIcon />
        </Link>
    </div>
);

export {BottomNavbar};