import {AssetCard} from "../components/assetCard/AssetCard.tsx";
import styles from "./Pages.module.css";

import {mockWallet} from "../../../mock_data/mock_data.ts";


const mock_assets = mockWallet.assets

const Portfolio = () => {

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            {/*This will later return fetched assets*/}
            {mock_assets.map((asset, index) => (
                <AssetCard key={index} asset={asset} />
            ))}
        </div>
    )
}
export default Portfolio;