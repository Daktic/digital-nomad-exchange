import styles from "./SwapBar.module.css";
import {Asset} from "../../types.ts";

interface SwapBarProps {
    tokenA: Asset;
    tokenB: Asset;
    tokenAAmount: number;
    tokenBAmount: number;
    lpAmount: number;
    handleTokenAInput: (amount: number) => void;
    handleTokenBInput: (amount: number) => void;
}

interface TokenAmountProps {
    token: Asset;
    tokenAmount: number;
    updateFunction: (amount: number) => void;
}

interface InputAmountProps {
    amount: number;
    updateFunction: (amount: number) => void
}




const SwapBar = ({ tokenA, tokenB, tokenAAmount, tokenBAmount, handleTokenAInput, handleTokenBInput }: SwapBarProps) => {


    return (
            <div className={styles.swapBar}>
                <TokenAmount
                    token={tokenA}
                    tokenAmount={tokenAAmount}
                    updateFunction={handleTokenAInput}
                ></TokenAmount>
                <TokenAmount
                    token={tokenB}
                    tokenAmount={tokenBAmount}
                    updateFunction={handleTokenBInput}
                ></TokenAmount>
            </div>
    );
};

export default SwapBar;


const InputAmount = ({ amount, updateFunction }: InputAmountProps) => (
<div className={styles.InputAmount}>
    <input             type="text"
                       inputMode="decimal"
                       pattern="[0-9.]*"
                       value={amount}
                       onInput={(e) => {
                           const parsedValue = parseFloat(e.target.value);
                           if (!isNaN(parsedValue)) {
                               updateFunction(parsedValue);
                           }
                       }}
    />
</div>
);

const TokenAmount = ({ token, tokenAmount, updateFunction }: TokenAmountProps) => (
<div className={styles.assetImgContainer}>
    <img
        className={styles.assetImg}
        alt={token.name}
        src={token.token_img}
    />
        <InputAmount
            amount={tokenAmount}
            updateFunction={updateFunction}
        ></InputAmount>
</div>
);

interface SwitchProps {
    checked: boolean;
    setChecked: (checked: boolean) => void;
}

export const SwitchBar = ({checked, setChecked}: SwitchProps) => {
    return (
        <div className={styles.switchBar}>
            <p>Swap</p>
            <Switch checked={checked} setChecked={setChecked} />
            <p>Supply</p>
        </div>
    )
}

const Switch = ({checked, setChecked}: SwitchProps) => {
    const handleToggle = (): void => {
        setChecked(!checked);
    }
    return (
        <label className={styles.switch}>
            <input
                className={styles.switchInput}
                type="checkbox"
                checked={checked}
                onChange={handleToggle}
            />
            <span className={styles.slider} />
        </label>
    )
}