import styles from "./Pages.module.css";
import {mockPools} from "../../../mock_data/mock_data.ts";
import {PoolCard} from "../components/poolCard/PoolCard.tsx";

const Pools = () => {

    return (
        <div className={styles.page}>
            <h1>Pools</h1>
            {/*This will later return fetched assets*/}
            {mockPools.map((pool, index) => (
            //     Pool Card
                <PoolCard key={index} pool={pool}/>
            ))}
        </div>
    )
}
export default Pools;