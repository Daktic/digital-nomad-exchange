import styles from "./PoolCard.module.css";
import {Asset, Pool} from "../../types"
import {route} from "preact-router";

// Prop Types
interface poolCardProps {
    pool: Pool;
}
interface PoolAssetImgProps {
    tokenA: Asset;
    tokenB: Asset;
}

interface PoolAssetSymbolProps {
    symbol: string;
}

interface PoolAssetAPYProps {
    apy: number;
}


const PoolCard = ({pool}: poolCardProps) => {

    return (
        <a href={"swap"}>
            <div className={styles.card}>
                <TokenImgs tokenA={pool.tokenA} tokenB={pool.tokenB}/>
                <PoolName symbol={pool.symbol}/>
                <PoolAPY apy={pool.apy}/>
            </div>
        </a>
)
}

const TokenImgs = ({tokenA, tokenB}: PoolAssetImgProps) => (
   <div className={styles.poolImageContainer}>
        <div className={styles.assetImgContainer}>
            <img className={styles.assetImg} alt={tokenA.name} src={tokenA.token_img}/>
        </div>
        <div>
            <img className={styles.assetImg} alt={tokenA.name} src={tokenB.token_img}/>
        </div>
   </div>
)

const PoolName = ({symbol}: PoolAssetSymbolProps) => (
    <div>
        <p>{symbol}</p>
    </div>
)

const PoolAPY = ({apy}: PoolAssetAPYProps) => (
    <div>
        <p>{apy}</p>
    </div>
)

export {PoolCard};