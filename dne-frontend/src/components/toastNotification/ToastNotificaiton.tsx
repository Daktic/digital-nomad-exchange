import {toast, ToastContainer } from "react-toastify";
import styles from './ToastNotification.module.css';

const ToastNotificaiton = () => {
    return (
            <ToastContainer
                className={styles.toastContainer}
                position="bottom-left"
                autoClose={10000}
                hideProgressBar={false}
                newestOnTop={false}
                rtl={false}
                theme="dark"
            />
    );
};

const notifyWithLink = (transactionSignature: string) => {
    toast.success(
        <div>
            Transaction successful!{" "}
            <a
                href={`https://solscan.io/tx/${transactionSignature}?cluster=devent`}
                target="_blank"
                rel="noopener noreferrer"
                style={{color: "#00d1b2", textDecoration: "underline"}}
            >
                View on Solscan
            </a>
        </div>
    );
};


    export {ToastNotificaiton, notifyWithLink}