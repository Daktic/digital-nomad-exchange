
import styles from "./WalletConnection.module.css";

interface Props {
    wallets: any[];
    onSelect: (wallet: any) => void;
}

export function WalletConnectionOptions({ wallets, onSelect }: Props) {
    if (!wallets.length) {
        return <div>No wallets found</div>;
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.walletConnectionContainer}>
                <h4>Choose a wallet:</h4>
                <ul>
                    {wallets.map((wallet) => (
                        <li key={wallet.name}>
                            <button onClick={() => onSelect(wallet)}>
                                {wallet.name || 'Unnamed Wallet'}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
