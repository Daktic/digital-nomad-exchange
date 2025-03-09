// WalletProvider.tsx

import { createContext } from 'preact';
import { useState, useContext } from 'preact/hooks';
import { getWallets } from '@wallet-standard/app';

const walletApi = getWallets();

interface WalletContextValue {
    selectedWallet: any;
    accounts: any[];
    detectWallets: () => void;
    connectSelectedWallet: () => Promise<void>;
    signTransaction: (txData: any) => Promise<any>;
}

export const WalletContext = createContext<WalletContextValue | undefined>(undefined);
export function WalletProvider({ children }: { children: any }) {
    const [selectedWallet, setSelectedWallet] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);

    function detectWallets() {
        // wallet-standard method to get discovered wallets
        const  wallets  = walletApi.get();
        if (wallets.length > 0) {
            // Might need to pick different ones
            setSelectedWallet(wallets[0]);
        }
    }

    async function connectSelectedWallet() {
        if (!selectedWallet) return;
        const connectFeature = selectedWallet.features['standard:connect'];
        if (!connectFeature) return;

        const { accounts } = await connectFeature.connect();
        setAccounts(accounts);
    }

    async function signTransaction(txData: any) {
        if (!selectedWallet) return;
        const signTxFeature = selectedWallet.features?.['standard:signTransaction'];
        if (!signTxFeature) return;

        return await signTxFeature.signTransaction(txData);
    }

    const value: WalletContextValue = {
        selectedWallet,
        accounts,
        detectWallets,
        connectSelectedWallet,
        signTransaction
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

// A convenience hook to use the context in any component later
export function useWallet() {
    return useContext(WalletContext);
}
