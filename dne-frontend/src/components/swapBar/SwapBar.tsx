import styles from "./SwapBar.module.css";
import {Asset} from "../../types.ts";

interface SwapBarProps {
    tokenA: Asset;
    tokenB: Asset;
}

interface PoolAssetImgProps {
    tokenA: Asset;
    tokenB: Asset;
}

const SwapBar = ({tokenA, tokenB}: SwapBarProps) => {

    return (
        <div className={styles.swapBarContainer}>
            <SwapAddSwitch />
            <div className={styles.swapBar}>
            <TokenImgs tokenA={tokenA} tokenB={tokenB} />
            </div>
        </div>
    )
}

export default SwapBar;

const SwapAddSwitch = () => (
    <div className={styles.swapSwitch}>

    </div>
)

const TokenImgs = ({tokenA, tokenB}: PoolAssetImgProps) => (
    <div className={styles.poolImageContainer}>
        <div className={styles.assetImgContainer}>
            <img className={styles.assetImg} alt={tokenA.name} src={tokenA.token_img}/>
        </div>
        <div className={styles.assetImgContainer}>
            <img className={styles.assetImg} alt={tokenA.name} src={tokenB.token_img}/>
        </div>
    </div>
)