import {AssetCard} from "../components/assetCard/AssetCard.tsx";
import styles from "./Pages.module.css";

const Portfolio = () => {

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <AssetCard />
        </div>
    )
}
export default Portfolio;