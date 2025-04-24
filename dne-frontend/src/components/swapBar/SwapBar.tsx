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
    supply?: boolean;
    reverseSwap?: boolean;
    setReverseSwap?: (reverseSwap: boolean) => void;
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

interface ButtonBarProps {
    supply: boolean;
    handleSwap: () => void;
    handleAddLiquidity?: () => void;
    handleRemoveLiquidity?: () => void;
}



const SwapBar = ({
                     tokenA,
                     tokenB,
                     tokenAAmount,
                     tokenBAmount,
                     handleTokenAInput,
                     handleTokenBInput,
                     supply,
                     reverseSwap,
                     setReverseSwap
                 }: SwapBarProps) => {

    const handleSwapReverse = () => {
        setReverseSwap && setReverseSwap(!reverseSwap);
    }

    return (
            <div className={styles.swapBar}>
                <TokenAmount
                    token={tokenA}
                    tokenAmount={tokenAAmount}
                    updateFunction={handleTokenAInput}
                ></TokenAmount>
                {!supply && <img
                    className={`${styles.arrow} ${reverseSwap ? styles.reversed : ""}`}
                    alt="arrow"
                    src="/arrow.svg"
                    onClick={handleSwapReverse}
                    />}
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

export const LPTokenSection = ({ token, tokenAmount, updateFunction }: TokenAmountProps) => (
    <div className={styles.lpTokenSection}>
        <TokenAmount
            token={token}
            tokenAmount={tokenAmount}
            updateFunction={updateFunction}
        />
    </div>
)

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

export const ButtonBar = ({supply, handleSwap, handleAddLiquidity, handleRemoveLiquidity}: ButtonBarProps) => (
    <div className={styles.buttonBarContainer}>
        {supply ? <SupplyButtons handleAddLiquidity={handleAddLiquidity} handleRemoveLiquidity={handleRemoveLiquidity}/> : <SwapButton handleSwap={handleSwap}/>}
    </div>
)

interface SwapButtonProps {
    handleSwap: () => void;
}

const SwapButton = ({handleSwap}:SwapButtonProps) => (
    <div onClick={handleSwap}>
        <button className={styles.swapBarButton}>Swap</button>
    </div>
)

interface SupplyButtonsProps {
    handleAddLiquidity?: () => void;
    handleRemoveLiquidity?: () => void;
}

const SupplyButtons = ({handleAddLiquidity, handleRemoveLiquidity}:SupplyButtonsProps) => (
    <div className={styles.swapBarButtonContainer}>
        <button className={styles.swapBarButton}
                onClick={handleAddLiquidity}
        >Supply</button>
        <button className={styles.swapBarButton}
                onClick={handleRemoveLiquidity}
        >Remove</button>
    </div>
)