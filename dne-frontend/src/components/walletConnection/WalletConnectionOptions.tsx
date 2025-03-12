import styles from "./WalletConnection.module.css";

interface Props {
    wallets: Record<string, any>; // Updated to accept an object instead of an array
    onSelect: (wallet: any) => void;
}

export function WalletConnectionOptions({ wallets, onSelect }: Props) {
    // Convert object to array and filter usable wallets
    const walletArray = Object.values(wallets).filter(wallet =>
        wallet.readyState === "Installed" || wallet.readyState === "Loadable"
    );

    if (!walletArray.length) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.walletConnectionContainer}>
                    <p>No wallets available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.walletConnectionContainer}>
                <h4>Choose a wallet:</h4>
                <ul>
                    {walletArray.map((wallet) => (
                        <li key={wallet.adapter?.name || wallet.adapter?.constructor.name}>
                            <button
                                onClick={() => onSelect(wallet)}
                                disabled={wallet.readyState !== "Installed" && wallet.readyState !== "Loadable"}
                                className={styles.walletButton}
                            >
                                {wallet.adapter?.name || "Unnamed Wallet"}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
