import styles from "./PoolCard.module.css";
import {Pool} from "../../types"

// Prop Types
interface poolCardProps {
    pool: Pool;
}
interface PoolAssetImgProps {
    symbol: string;
    img_uri: string;
}

interface PoolAssetSymbolProps {
    symbol: string;
}

interface PoolAssetAPYProps {
    apy: number;
}


const PoolCard = ({pool}: poolCardProps) => {
    return (
        <div className={styles.card}>
            <p>Test</p>
        </div>
    )
}

const TokenAImg = ({symbol, img_uri}: PoolAssetImgProps) => (
    <div className={styles.assetImgContainer}>
        <img className={styles.assetImg} alt={symbol} src={img_uri}/>
    </div>
)

const TokenBImg = ({symbol, img_uri}: PoolAssetImgProps) => (
    <div className={styles.assetImgContainer}>
        <img className={styles.assetImg} alt={symbol} src={img_uri}/>
    </div>
)

const AssetName = ({symbol}: PoolAssetSymbolProps) => (
    <div>
        <p>{symbol}</p>
    </div>
)

const AssetPrice = ({apy}: PoolAssetAPYProps) => (
    <div>
        <p>{apy}</p>
    </div>
)

export {PoolCard};