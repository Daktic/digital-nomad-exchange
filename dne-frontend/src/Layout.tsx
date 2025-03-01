
import styles from './layout.module.css';
import {BottomNavbar} from "./components/bottomButtonBar/BottomActionBar.tsx";

// @ts-ignore
const Layout = ({ children }) => {
    return (
        <div class={styles.container}>
            <main class={styles.content}>{children}</main>
            <BottomNavbar />
        </div>
    );
};

export default Layout;
