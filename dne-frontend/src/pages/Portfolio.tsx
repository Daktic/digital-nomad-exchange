import {AssetCard} from "../components/assetCard/AssetCard.tsx";
import styles from "./Pages.module.css";

import {mockWallet} from "../../../mock_data/mock_data.ts";


const mock_asset = mockWallet.assets[0]

const Portfolio = () => {

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <AssetCard asset={mock_asset} />
        </div>
    )
}
export default Portfolio;