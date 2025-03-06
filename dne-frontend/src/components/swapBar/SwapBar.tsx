import styles from "./SwapBar.module.css";
import { Asset } from "../../types.ts";
import { useState } from "preact/hooks";

interface SwapBarProps {
    tokenA: Asset;
    tokenB: Asset;
}

interface PoolAssetImgProps {
    tokenA: Asset;
    tokenB: Asset;
}

interface TokenAmountProps {
    token: Asset;
    tokenAmount: number;
    update: (amount: number) => void;
}

const SwapBar = ({ tokenA, tokenB }: SwapBarProps) => {
    const [tokenAAmount, setTokenAAmount] = useState(0);
    const [tokenBAmount, setTokenBAmount] = useState(0);
    const [lpTokenAmount, setLPTokenAmount] = useState(0);

    return (
        <div className={styles.swapBarContainer}>
            <SwapAddSwitch></SwapAddSwitch>
            <div className={styles.swapBar}>
                <TokenAmount
                    token={tokenA}
                    tokenAmount={tokenAAmount}
                    update={setTokenAAmount}
                ></TokenAmount>
                <TokenAmount
                    token={tokenB}
                    tokenAmount={tokenBAmount}
                    update={setTokenBAmount}
                ></TokenAmount>
            </div>
        </div>
    );
};

export default SwapBar;

const SwapAddSwitch = () => (
    <div className={styles.swapSwitch}>

    </div>
);


const InputAmount = ({ amount, update }: {
amount: number;
update: (amount: number) => void
}) => (
<div className={styles.InputAmount}>
    <input             type="number"
                       inputMode="decimal"
                       pattern="[0-9.]*"
                       value={amount}
                       onInput={(e) => update(parseFloat(e.target.value) || 0)}
    />
</div>
);

const TokenAmount = ({ token, tokenAmount, update }: TokenAmountProps) => (
<div className={styles.assetImgContainer}>
    <img
        className={styles.assetImg}
        alt={token.name}
        src={token.token_img}
    />
        <InputAmount
            amount={tokenAmount}
            update={update}
        ></InputAmount>
</div>
);