// src/App.tsx
import { Router, Route } from 'wouter';
import Portfolio from './pages/Portfolio';
import Pools from './pages/Pools';
import Swap from "./pages/SwapScreen.tsx";
import Layout from "./Layout.tsx";

import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";



const App = () => {

    const network = WalletAdapterNetwork.Devnet;
    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            // if desired, manually define specific/custom wallets here (normally not required)
            // otherwise, the wallet-adapter will auto-detect the wallets a user's browser has available
        ],
        [network],
    );

    return (
    <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
                <Layout>
                    <Router>
                        <Route path="/" component={Portfolio}/>
                        <Route path="/pools" component={Pools}/>
                        <Route path="/swap" component={Swap}/>
                    </Router>
                </Layout>
            </WalletModalProvider>
        </WalletProvider>
    </ConnectionProvider>
    );
};



export {App};