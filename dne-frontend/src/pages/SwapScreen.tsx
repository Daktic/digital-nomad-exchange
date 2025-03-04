import styles from "./Pages.module.css";
import SwapBar from "../components/swapBar/SwapBar.tsx";
import {mockPools} from "../../../mock_data/mock_data.ts";

const testPool = mockPools[0]

const Swap = () => {


    return (
        <div className={styles.page}>
            <SwapBar tokenA={testPool.tokenA} tokenB={testPool.tokenB} />
        </div>
    )
};
export default Swap;