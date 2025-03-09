// WalletProvider.tsx (simplified example)

import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import { getWallets } from '@wallet-standard/app';

interface WalletContextValue {
    wallets: any[];
    selectedWallet: any | null;
    accounts: any[];
    detectWallets: () => void;
    connectSelectedWallet: (walletToConnect: any) => Promise<any[]>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: any }) {
    const [wallets, setWallets] = useState<any[]>([]);
    const [selectedWallet, setSelectedWallet] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);

    function detectWallets() {
        const walletsApi = getWallets();
        const discovered = walletsApi.get();
        setWallets([...discovered]);
    }

    async function connectSelectedWallet(walletToConnect: any): Promise<any[]> {
        // Store the user’s chosen wallet
        setSelectedWallet(walletToConnect);

        // Then call its connect() method
        const connectFeature = walletToConnect.features?.['standard:connect'];
        if (!connectFeature) {
            return []; // return an empty array if no connect feature
        }

        const { accounts } = await connectFeature.connect();
        setAccounts(accounts);
        return accounts;
    }


    return (
        <WalletContext.Provider
            value={{
                wallets,
                selectedWallet,
                accounts,
                detectWallets,
                connectSelectedWallet
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return ctx;
}
