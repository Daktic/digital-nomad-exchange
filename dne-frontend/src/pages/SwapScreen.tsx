import styles from "./Pages.module.css";
import SwapBar, {ButtonBar, SwitchBar} from "../components/swapBar/SwapBar.tsx";
import {mockPools} from "../../../mock_data/mock_data.ts";
import {useState} from "preact/hooks";

const testPool = mockPools[0]

const fee = 0.25;

const Swap = () => {

    const [swapOrSupply, setSwapOrSupply] = useState(false);

    const [tokenAAmount, setTokenAAmount] = useState(0);
    const [tokenBAmount, setTokenBAmount] = useState(0);
    const [lpTokenAmount, setLPTokenAmount] = useState(0);

    const [tokenAReserve, setTokenAReserve] = useState(1000);
    const [tokenBReserve, setTokenBReserve] = useState(1000);
    const [lpReserve, setReserve] = useState(Math.sqrt(1000 * 1000));

    const handleTokenAInput = (newAmount: number) => {
        setTokenAAmount(newAmount);
        // If Token A changes, update others
        const newState = calculateTokenAmounts({
            tokenAAmount: tokenAReserve,
            tokenBAmount: tokenBReserve,
            swapAmount: newAmount,
            fee:fee,
            lpAmount: lpReserve,
            swapType:swapType.AforB
        })

        setTokenBAmount(newState.tokenBAmount);
        setLPTokenAmount(newState.lpAmount);
    }

    const handleTokenBInput = (newAmount: number) => {
        setTokenBAmount(newAmount);
        // If Token A changes, update others
        const newState = calculateTokenAmounts({
            tokenAAmount: tokenAReserve,
            tokenBAmount: tokenBReserve,
            swapAmount: newAmount,
            fee:fee,
            lpAmount: lpReserve,
            swapType:swapType.BforA
        })

        setTokenAAmount(newState.tokenAAmount);
        setLPTokenAmount(newState.lpAmount);
    }

    return (
        <div className={styles.page}>
            <SwitchBar checked={swapOrSupply} setChecked={setSwapOrSupply} />
            <div className={styles.swapBarContainer}>
                <SwapBar
                    tokenA={testPool.tokenA}
                    tokenB={testPool.tokenB}
                    tokenAAmount={tokenAAmount}
                    tokenBAmount={tokenBAmount}
                    lpAmount={lpTokenAmount}
                    handleTokenAInput={handleTokenAInput}
                    handleTokenBInput={handleTokenBInput}
                />
            </div>
            <div className={styles.spacer}>
            </div>
            <ButtonBar supply={swapOrSupply}/>
        </div>
    )
};
export default Swap;

interface calculateSwap {
    tokenAAmount: number;
    tokenBAmount: number;
    swapAmount: number;
    fee:number;
    lpAmount: number;
    swapType:swapType
}

enum swapType {
    AforB=0,
    BforA=1,
    LPforAB=2,
    ABforLP=3
}

interface swapProduct {
    tokenAAmount: number;
    tokenBAmount: number;
    lpAmount: number;
}

const calculateTokenAmounts = (swap: calculateSwap): swapProduct => {
    let newTokenA: number;
    let newTokenB: number;
    let newLp: number;

    console.log(swap)

    if (swap.swapType === 0) {
        newTokenA = swap.tokenAAmount - swap.swapAmount;
        newTokenB =  calulateSwap(swap.tokenAAmount, swap.tokenBAmount, swap.swapAmount, swap.fee);
        newLp = swap.lpAmount;
    } else if (swap.swapType === 1) {
        newTokenA = calulateSwap(swap.tokenBAmount, swap.tokenAAmount, swap.swapAmount, swap.fee);
        newTokenB =  swap.tokenBAmount - swap.swapAmount;
        newLp = swap.lpAmount;
    } else {
        return calulateAddRemove(swap)
    }

    return {
        tokenAAmount: newTokenA,
        tokenBAmount: newTokenB,
        lpAmount: newLp,
    }
};

const calulateSwap = (tokenA:number, tokenB:number, swapAmount:number, fee:number): number => {
    if (swapAmount <= 0 || tokenA <= 0 || tokenB <= 0) return 0;

    const amountAfterFee = swapAmount * (1 - fee);

    return (amountAfterFee * tokenB) /
        (tokenA + amountAfterFee);
}

const calulateAddRemove = (swap: calculateSwap): swapProduct => {
    let newTokenA: number;
    let newTokenB: number;
    let newLp: number;

    if (swap.swapType === 2) {
        // LP for AB
        newTokenA = 0;
        newTokenB = 0;
        newLp = 0;
    } else {
        // AB for LP
        newTokenA = 0;
        newTokenB = 0;
        newLp = 0;
    }
    return {
        tokenAAmount: newTokenA,
        tokenBAmount: newTokenB,
        lpAmount: newLp,
    }
}

