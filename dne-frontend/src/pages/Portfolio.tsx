
import styles from "./Pages.module.css";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";


const Portfolio = () => {

    const { publicKey, sendTransaction } = useWallet();



    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <h3 style={{
                textAlign: "center",
                scale: 0.5,
                fontSize: 15,
            }}>{publicKey}</h3>
            {/*This will later return fetched assets*/}
            <button onClick={() => {}} >Click Me</button>
        </div>
    )
}
export default Portfolio;