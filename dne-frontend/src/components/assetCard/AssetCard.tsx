import styles from "./AssetCard.module.css";
import {Asset} from "../../ty"

const AssetCard = () => {
    return (
        <div className={styles.card}>
            card
        </div>
    )
}

const AssetImg = (asset:Asset) => (
    <div>
        <img alt={}/>
    </div>
)

export {AssetCard};