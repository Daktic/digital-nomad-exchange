import styles from "./Pages.module.css";
import SwapBar, {SwitchBar} from "../components/swapBar/SwapBar.tsx";
import {mockPools} from "../../../mock_data/mock_data.ts";
import {useState} from "preact/hooks";

const testPool = mockPools[0]

const Swap = () => {

    const [swapOrAdd, setSwapOrAdd] = useState(false);

    return (
        <div className={styles.page}>
            <SwitchBar checked={swapOrAdd} setChecked={setSwapOrAdd} />
            <div className={styles.swapBarContainer}>
                <SwapBar tokenA={testPool.tokenA} tokenB={testPool.tokenB} />
            </div>
        </div>
    )
};
export default Swap;