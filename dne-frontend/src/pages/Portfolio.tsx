import styles from "./Pages.module.css";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

const Portfolio = () => {
    const { publicKey, connected } = useWallet();

    // Example: Log whenever the wallet changes
    useEffect(() => {
        if (publicKey) {
            console.log("Wallet changed, new publicKey: ", publicKey.toBase58());
        } else {
            console.log("Wallet disconnected");
        }
    }, [publicKey]);

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <p>Connected? {connected ? "Yes" : "No"}</p>
            <p>{publicKey ? publicKey.toBase58() : "No wallet connected"}</p>

            <button onClick={() => console.log(publicKey)}>Check Key in Console</button>
        </div>
    );
};

export default Portfolio;