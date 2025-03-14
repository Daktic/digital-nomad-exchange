
import styles from "./Pages.module.css";

// Wallet Adapter React
import {useAnchorWallet, useConnection} from "@solana/wallet-adapter-react";

// Anchor
import {AnchorProvider, Program, setProvider} from "@coral-xyz/anchor";

import idl from "../../../onchain/target/idl/digital_nomad_exchange.json";
import type {DigitalNomadExchange} from "../../../onchain/target/types/digital_nomad_exchange";
import {useState} from "preact/hooks";
import {Keypair, SystemProgram, Transaction} from "@solana/web3.js";
import {
    createInitializeMintInstruction,
    getMinimumBalanceForRentExemptMint,
    MINT_SIZE,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";

export default function Portfolio() {

    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    setProvider(provider);

    const program = new Program(idl as DigitalNomadExchange, provider);


    const [tokenAMint, setTokenAMint] = useState("");
    const [tokenBMint, setTokenBMint] = useState("");

    const createMint = async (event: any) => {
        event.preventDefault();
        if (!connection || !wallet?.publicKey) {
            return;
        }

        const mint = Keypair.generate();

        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const transaction = new Transaction();

        transaction.add(
            SystemProgram.createAccount({
                fromPubkey: wallet?.publicKey,
                newAccountPubkey: mint.publicKey,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(
                mint.publicKey,
                0,
                wallet?.publicKey,
                wallet?.publicKey,
                TOKEN_PROGRAM_ID
            )
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = wallet.publicKey;

        const sig = await wallet.signTransaction(transaction);
        console.log("MINT Created:", mint.publicKey.toBase58(), sig);

        if (tokenAMint === "") {
            setTokenAMint(mint.publicKey.toBase58())
        } else if (tokenBMint === "") {
            setTokenBMint(mint.publicKey.toBase58())
        }
    };





    // const handleCreateMint = async () => {
    //     await program.methods
    //         .initialize()
    //         .accounts([])
    //         .signers([])
    //         .rpc();
    // }


    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <p>Connected? {wallet ? "Yes" : "No"}</p>
            <p>{wallet?.publicKey ? wallet?.publicKey.toBase58() : "No wallet connected"}</p>

            <button onClick={createMint}>
                Mint
            </button>
            <p>Token A Mint: {tokenAMint || "Not Yet Minted"}</p>
            <p>Token B Mint: {tokenBMint || "Not Yet Minted"}</p>
        </div>
    );
}
