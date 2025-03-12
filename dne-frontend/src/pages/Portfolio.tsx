import { useEffect } from "react";
import styles from "./Pages.module.css";

// Wallet Adapter React
import {useWallet, useAnchorWallet, useConnection} from "@solana/wallet-adapter-react";

// Anchor
import { AnchorProvider } from "@coral-xyz/anchor";

// Solana Web3
import { Connection, Keypair, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

// SPL Token
import {
    createInitializeMintInstruction,
    getMinimumBalanceForRentExemptMint,
    MINT_SIZE,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {useState} from "react";

export default function Portfolio() {
    // useWallet() => for checking 'connected', 'publicKey', etc.
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [tokenAMint, setTokenAMint] = useState("");
    const [tokenBMint, setTokenBMint] = useState("");

    useEffect(() => {
        if (publicKey) {
            console.log("Wallet changed, new publicKey:", publicKey.toBase58());
        } else {
            console.log("Wallet disconnected");
        }
    }, [publicKey]);

    const createMint = async (event: any) => {
        event.preventDefault();
        if (!connection || !publicKey) {
            return;
        }

        const mint = Keypair.generate();

        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const transaction = new Transaction();

        transaction.add(
            SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: mint.publicKey,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(
                mint.publicKey,
                0,
                publicKey,
                publicKey,
                TOKEN_PROGRAM_ID
            )
        );

        const sig = await sendTransaction(transaction, connection, {signers: [mint]});
        console.log("MINT Created:", mint.publicKey.toBase58(), sig);

        if (tokenAMint === "") {
            setTokenAMint(mint.publicKey.toBase58())
        } else if (tokenBMint === "") {
            setTokenBMint(mint.publicKey.toBase58())
        }
    };

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <p>Connected? {connected ? "Yes" : "No"}</p>
            <p>{publicKey ? publicKey.toBase58() : "No wallet connected"}</p>

            <button onClick={createMint}>
                Mint
            </button>
            <p>Token A Mint: {tokenAMint || "Not Yet Minted"}</p>
            <p>Token B Mint: {tokenBMint || "Not Yet Minted"}</p>
        </div>
    );
}
