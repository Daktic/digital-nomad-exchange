import styles from "./Pages.module.css";
import SwapBar, {ButtonBar, LPTokenSection, SwitchBar} from "../components/swapBar/SwapBar.tsx";
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
        let swap: AnySwap;
        if (swapOrSupply) {
            swap = {
                tokenAAmount: tokenAAmount,
                tokenBAmount: tokenBAmount,
                lpAmount: lpTokenAmount,
                swapType:swapType.ABforLP,
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                lpTotalSupply: lpReserve
            }

        } else {
            swap = {
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                swapAmount: newAmount,
                fee: fee,
                lpTotalSupply: lpReserve,
                swapType: swapType.AforB
            }
        }

        console.log("Swap", swap);
        const newState = calculateTokenAmounts(swap)

        setTokenBAmount(newState.tokenBAmount);
        setLPTokenAmount(newState.lpAmount);
    }

    const handleTokenBInput = (newAmount: number) => {
        setTokenBAmount(newAmount);
        let swap: AnySwap;
        if (swapOrSupply) {
            swap = {
                tokenAAmount: tokenAAmount,
                tokenBAmount: tokenBAmount,
                lpAmount: lpTokenAmount,
                swapType:swapType.ABforLP,
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                lpTotalSupply: lpReserve
            }

        } else {
            swap = {
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                swapAmount: newAmount,
                fee:fee,
                lpTotalSupply: lpReserve,
                swapType:swapType.BforA
            }
        }
        // If Token A changes, update others
        const newState = calculateTokenAmounts(swap)

        setTokenAAmount(newState.tokenAAmount);
        setLPTokenAmount(newState.lpAmount);
    }

    const handleLPTokenInput = (newAmount: number) => {
        setLPTokenAmount(newAmount);
        const newState = calculateTokenAmounts({
            tokenAAmount: tokenAAmount,
            tokenBAmount: tokenBAmount,
            lpAmount: lpTokenAmount,
            swapType:swapType.LPforAB,
            tokenAReserve: tokenAReserve,
            tokenBReserve: tokenBReserve,
            lpTotalSupply: lpReserve
        })
        setTokenAAmount(newState.tokenAAmount);
        setTokenBAmount(newState.lpAmount);
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
            {
                swapOrSupply ?
                        (<LPTokenSection
                            token={testPool.lpToken}
                            tokenAmount={lpTokenAmount}
                            updateFunction={handleLPTokenInput}
                        />)
                : (<div className={styles.spacer}></div>)

            }
            <ButtonBar supply={swapOrSupply}/>
        </div>
    )
};
export default Swap;


interface BaseSwap {
    swapType:swapType
    tokenAReserve: number;
    tokenBReserve: number;
    lpTotalSupply: number;
}

interface RegularSwap extends BaseSwap {
    swapType: swapType.AforB | swapType.BforA
    swapAmount: number;
    fee:number;
}

interface LiquiditySwap extends BaseSwap {
    swapType: swapType.LPforAB | swapType.ABforLP
    tokenAAmount: number;
    tokenBAmount: number;
    lpAmount: number;
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

type AnySwap = RegularSwap | LiquiditySwap

const calculateTokenAmounts = (swap: AnySwap): swapProduct  => {
    let newTokenA: number;
    let newTokenB: number;
    let newLp: number;

    console.log(swap)

    if (swap.swapType === 0) {
        newTokenA = swap.tokenAReserve - swap.swapAmount;
        newTokenB =  calulateSwap(swap.tokenAReserve, swap.tokenBReserve, swap.swapAmount, swap.fee);
        newLp = swap.lpTotalSupply;
    } else if (swap.swapType === 1) {
        newTokenA = calulateSwap(swap.tokenBReserve, swap.tokenAReserve, swap.swapAmount, swap.fee);
        newTokenB =  swap.tokenBReserve - swap.swapAmount;
        newLp = swap.lpTotalSupply;
    } else if (swap.swapType === 2 || swap.swapType === 3) {
        return calulateAddRemove(swap)
    } else {
        throw new Error("Unrecognized swap type")
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

const calulateAddRemove = (supply: LiquiditySwap): swapProduct => {
    // We assume that the pools have been set up if they exist here. so we can skip accounting for initial deposit math.

    let newTokenA: number;
    let newTokenB: number;
    let newLp: number;

    if (supply.swapType === 2) {
        // LP for AB
        const lpFraction = supply.lpAmount / supply.lpTotalSupply;
        newTokenA = supply.tokenAReserve * lpFraction;
        newTokenB = supply.tokenBReserve * lpFraction;
        newLp = supply.lpTotalSupply-supply.lpAmount;
    } else {
        // AB for LP
        const minTBD = Math.min(
            Number(BigInt(supply.tokenAReserve)/BigInt(supply.tokenAReserve)),
            Number(BigInt(supply.tokenBReserve)/BigInt(supply.tokenBReserve))
        )
        newTokenA = supply.tokenAReserve + supply.tokenAReserve;
        newTokenB = supply.tokenBReserve + supply.tokenBReserve;
        newLp = supply.lpTotalSupply + minTBD;
    }
    return {
        tokenAAmount: newTokenA,
        tokenBAmount: newTokenB,
        lpAmount: newLp,
    }
}

