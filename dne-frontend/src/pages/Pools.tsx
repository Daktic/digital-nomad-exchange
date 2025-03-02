import styles from "./Pages.module.css";
import {mockPools} from "../../../mock_data/mock_data.ts";

const Pools = () => {

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            {/*This will later return fetched assets*/}
            {mockPools.map((pool, index) => (
            //     Pool Card
            ))}
        </div>
    )
}
export default Pools;