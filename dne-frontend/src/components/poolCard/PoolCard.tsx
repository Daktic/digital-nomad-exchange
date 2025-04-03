import styles from "./PoolCard.module.css";
import {Asset, Pool} from "../../types"

// Prop Types
interface poolCardProps {
    pool: Pool;
}
interface PoolAssetProps {
    tokenA: Asset;
    tokenB: Asset;
}

interface PoolAssetSymbolProps {
    symbol: string;
}

const buildSolScanUrl = (address: string) => {
    return `https://solscan.io/address/${address}?cluster=devnet`;
}

const buildSwapUrl = (address: string) => {
    return `http://localhost:5173/swap?pool=${address}`;
}

const PoolCard = ({pool}: poolCardProps) => {

    return (
        <a href={buildSwapUrl(pool.address)}>
            <div className={styles.card}>
                    <TokenImgs tokenA={pool.tokenA} tokenB={pool.tokenB} />
                    <PoolSymbol symbol={pool.symbol}/>
                <PoolName tokenA={pool.tokenA} tokenB={pool.tokenB}/>
            </div>
        </a>
)
}

const TokenImgs = ({tokenA, tokenB}: PoolAssetProps) => (
   <div className={styles.poolImageContainer}>
        <div className={styles.assetImgContainer}>
            <img className={styles.assetImg} alt={tokenA.name} src={tokenA.token_img}/>
        </div>
        <div className={styles.assetImgContainer}>
            <img className={styles.assetImg} alt={tokenB.name} src={tokenB.token_img}/>
        </div>
   </div>
)

const PoolSymbol = ({symbol}: PoolAssetSymbolProps) => (
    <div>
        <p>{symbol}</p>
    </div>
)

const PoolName = ({tokenA, tokenB}: PoolAssetProps) => (
    <div>
        <a href={buildSolScanUrl(tokenA.address)} target="_blank" rel="noopener noreferrer">
            <p>{tokenA.name}</p></a>
        <a href={buildSolScanUrl(tokenB.address)} target="_blank" rel="noopener noreferrer">
            <p>{tokenB.name}</p></a>
    </div>
)

export {PoolCard};