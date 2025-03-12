import { Link } from "wouter";
import styles from "./BottomActionBar.module.css";
import { PortfolioIcon, SupplyIcon, SwapIcon, WalletIcon } from "./ButtonBarIcons.tsx";
import { WalletConnectionOptions } from "../walletConnection/WalletConnectionOptions.tsx";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const truncateAddress = (address: string) => address.slice(0, 5);

const BottomNavbar = () => {
        const { publicKey, connect, disconnect, select, wallets } = useWallet();
        const [showWalletOptions, setShowWalletOptions] = useState(false);

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
                        select(wallet.adapter.name); // Select wallet first
                        await connect(); // Then attempt to connect
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
                                publicKey={publicKey}
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
        publicKey: any;
        handleClick?: () => void;
}

const WalletIconSymbol = ({ publicKey, handleClick }: WalletIconSymbolProps) => {
        const fillColor = publicKey ? "rgba(128, 0, 128, 0.7)" : "white";
        const walletAddress = publicKey ? truncateAddress(publicKey.toBase58()) : "Connect";

        return (
            <div className={`${styles.item} ${styles.walletIconItem}`} onClick={handleClick}>
                    <WalletIcon fillColor={fillColor} />
                    <p>{walletAddress}</p>
            </div>
        );
};

export { BottomNavbar };
