import {Link} from "wouter";
import styles from "./BottomActionBar.module.css";
import {PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon} from "./ButtonBarIcons.tsx";
import {WalletConnectionOptions} from "../walletConnection/WalletConnectionOptions.tsx";
import {useWallet} from "../../WalletProvider.tsx";
import {useState} from "preact/hooks";

const BottomNavbar = () => {

        const {
                detectWallets,
                connectSelectedWallet,
                wallets,
                // selectedWallet,
                // accounts
        } = useWallet();

        // show/hide the popup
        const [showWalletOptions, setShowWalletOptions] = useState(false);

        function handleOpenWalletOptions() {
                // find wallets
                detectWallets();
                // toggle the Visual component
                setShowWalletOptions(!showWalletOptions);
        }

        // user picked a specific wallet from the list
        function handleWalletClick(wallet: any) {
                // connect to that wallet
                connectSelectedWallet(wallet);
                // close the UI component
                setShowWalletOptions(false);
        }

        return (
        <div className={styles.navbar}>
                <Link to="/portfolio" className={styles.item}>
                        <PortfolioIcon/>
                </Link>
                <Link to="/swap" className={styles.item}>
                        <SwapIcon/>
                </Link>
                <Link to="/pools" className={styles.item}>
                        <SupplyIcon/>
                </Link>
                <WalletIcon onClick={handleOpenWalletOptions}/>
                {
                        // Show wallet connection options if clicked
                    showWalletOptions && (
                        <WalletConnectionOptions
                                wallets={wallets}
                                onSelect={handleWalletClick}
                                />
                    )
                }
        </div>
        )
};

export {BottomNavbar};