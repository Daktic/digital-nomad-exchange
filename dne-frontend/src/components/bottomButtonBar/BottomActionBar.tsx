import {Link} from "wouter";
import styles from "./BottomActionBar.module.css";
import {PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon} from "./ButtonBarIcons.tsx";
import {WalletConnectionOptions} from "../walletConnection/WalletConnectionOptions.tsx";
import {useWallet} from "../../WalletProvider.tsx";
import {useState} from "preact/hooks";


const truncateAddress = (address: string) => {
        return address.slice(0, 5);
}

const BottomNavbar = () => {

        const [walletConnected, setWalletConnected] = useState(false);
        const [walletAddress, setWalletAddress] = useState("");

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
        async function handleWalletClick(wallet: any) {
                // connect to that wallet
                const accounts = await connectSelectedWallet(wallet);
                // close the UI component
                setShowWalletOptions(false);
                // Get and show wallet Address in icon
                if (accounts && accounts.length > 0) {
                        setWalletConnected(true);
                        const truncatedAddress= truncateAddress(accounts[0].address);
                        setWalletAddress(truncatedAddress);
                }
        }

        return (
        <div className={styles.navbar}>
                <div className={styles.item}>
                        <Link to="/portfolio" >
                                <PortfolioIcon/>
                        </Link>
                </div>
                <div className={styles.item}>
                        <Link to="/swap" className={styles.item}>
                                <SwapIcon/>
                        </Link>
                </div>
                <div className={styles.item}>
                        <Link to="/pools" className={styles.item}>
                                <SupplyIcon/>
                        </Link>
                </div>
                <div className={styles.item}>
                        <WalletIconSymbol walletConnected={walletConnected} handleClick={handleOpenWalletOptions} walletAddress={walletAddress}/>
                </div>
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
        walletAddress?: string
        walletConnected: boolean
        handleClick?: () => void;
}

const WalletIconSymbol = ({walletAddress, walletConnected, handleClick}: WalletIconSybolProps )=> {
        const fillColor = walletConnected ? "rgba(128, 0, 128, 0.7)" : "white";

        return (
            <div className={`${styles.item} ${styles.walletIconItem}`} onClick={handleClick}>
                    <WalletIcon fillColor={fillColor} />
                    <p>{walletAddress}</p>
            </div>
        )
}

export {BottomNavbar};