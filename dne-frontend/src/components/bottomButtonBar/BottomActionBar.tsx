import { Link } from "wouter";
import styles from "./BottomActionBar.module.css";
import { PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon } from "./ButtonBarIcons.tsx";
import { WalletConnectionOptions } from "../walletConnection/WalletConnectionOptions.tsx";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const truncateAddress = (address: string) => address.slice(0, 5);

const BottomNavbar = () => {
        const { publicKey,  disconnect, wallets } = useWallet();
        const [showWalletOptions, setShowWalletOptions] = useState(false);
        const [selectedWallet, setSelectedWallet] = useState(null);

        function handleOpenWalletOptions() {
                if (publicKey) {
                        disconnect(); // Disconnect if already connected
                } else {
                        console.log(wallets);
                        setShowWalletOptions(!showWalletOptions);
                }
        }

        async function handleWalletClick(wallet: any) {
                try {
                        await wallet.adapter.connect();
                        setSelectedWallet(wallet);
                        setShowWalletOptions(false);
                } catch (error) {
                        console.error("Failed to connect wallet:", error);
                }
        }

        return (
            <div className={styles.navbar}>
                    <div className={styles.item}>
                            <Link to="/portfolio">
                                    <PortfolioIcon />
                            </Link>
                    </div>
                    <div className={styles.item}>
                            <Link to="/swap">
                                    <SwapIcon />
                            </Link>
                    </div>
                    <div className={styles.item}>
                            <Link to="/pools">
                                    <SupplyIcon />
                            </Link>
                    </div>
                    <div className={styles.item}>
                            <WalletIconSymbol
                                wallet={selectedWallet}
                                handleClick={handleOpenWalletOptions}
                            />
                    </div>

                    {showWalletOptions && (
                        <WalletConnectionOptions
                            wallets={wallets}
                            onSelect={handleWalletClick}
                        />
                    )}
            </div>
        );
};

interface WalletIconSymbolProps {
        wallet: any;
        handleClick?: () => void;
}

const WalletIconSymbol = ({ wallet, handleClick }: WalletIconSymbolProps) => {
        const fillColor = wallet?.adapter.connected ? "rgba(128, 0, 128, 0.7)" : "white";
        const walletAddress = wallet ? truncateAddress(wallet.adapter.publicKey.toBase58()) : "Connect";

        return (
            <div className={`${styles.item} ${styles.walletIconItem}`} onClick={handleClick}>
                    <WalletIcon fillColor={fillColor} />
                    <p>{walletAddress}</p>
            </div>
        );
};

export { BottomNavbar };
