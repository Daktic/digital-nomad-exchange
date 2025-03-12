import {AssetCard} from "../components/assetCard/AssetCard.tsx";
import styles from "./Pages.module.css";

import {mockWallet} from "../../../mock_data/mock_data.ts";
import {useWallet} from "../WalletProvider.tsx";

import {createLiquidityPool} from "../onchain.ts"
import {PublicKey} from "@solana/web3.js";


const mock_assets = mockWallet.assets

const Portfolio = () => {

    const { accounts } = useWallet();

    const address = accounts[0]?.address;

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <h3 style={{
                textAlign: "center",
                scale: 0.5,
                fontSize: 15,
            }}>{address}</h3>
            {/*This will later return fetched assets*/}
            <button onClick={() => {createLiquidityPool(accounts[0])}} >Click Me</button>
        </div>
    )
}
export default Portfolio;