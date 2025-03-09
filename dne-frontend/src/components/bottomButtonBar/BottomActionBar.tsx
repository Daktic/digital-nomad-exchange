import {Link} from "wouter";
import styles from "./BottomActionBar.module.css";
import {PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon} from "./ButtonBarIcons.tsx";
import {WalletConnectionOptions} from "../walletConnection/WalletConnectionOptions.tsx";
import {useWallet} from "../../WalletProvider.tsx";
import {useState} from "preact/hooks";

const BottomNavbar = () => {

        const [walletConnected, setWalletConnected] = useState(false);

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
                <WalletIconSymbol walletConnected={walletConnected} handleClick={handleOpenWalletOptions}/>
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

interface WalletIconSybolProps  {
        walletAddress?: String
        walletConnected: Boolean
        handleClick?: () => void;
}

const WalletIconSymbol = ({walletAddress, walletConnected, handleClick}: WalletIconSybolProps )=> {
        const fillColor = walletConnected ? "rgba(128, 0, 128, 0.7)" : "white";

        return (
            <div className={styles.walletIconContainer} onClick={handleClick}>
                    <WalletIcon fillColor={fillColor} />
                    <p>{walletAddress}</p>
            </div>
        )
}

export {BottomNavbar};