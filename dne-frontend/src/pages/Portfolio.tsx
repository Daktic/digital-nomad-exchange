
import styles from "./Pages.module.css";

// Wallet Adapter React
import {useAnchorWallet, useConnection, useWallet} from "@solana/wallet-adapter-react";

// Anchor
import {AnchorProvider, Program, setProvider} from "@coral-xyz/anchor";

import idl from "../../../onchain/target/idl/digital_nomad_exchange.json";
import type {DigitalNomadExchange} from "../../../onchain/target/types/digital_nomad_exchange";
import {useState} from "preact/hooks";
import {Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction} from "@solana/web3.js";
import {
    createInitializeMintInstruction,
    getMinimumBalanceForRentExemptMint,
    MINT_SIZE,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";

const derivePDA = (programId, seeds) => {
    return PublicKey.findProgramAddressSync(seeds, programId);
}

export default function Portfolio() {

    const { sendTransaction, publicKey } = useWallet();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    setProvider(provider);

    const program = new Program(idl as DigitalNomadExchange, provider);


    const [tokenAMint, setTokenAMint] = useState("");
    const [tokenBMint, setTokenBMint] = useState("");
    const [lpMint, setLpMint] = useState("");



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

        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = publicKey;

        const sig = await sendTransaction(transaction, connection, {signers: [mint]});
        console.log("MINT Created:", mint.publicKey.toBase58(), sig);

        if (tokenAMint === "") {
            setTokenAMint(mint.publicKey.toBase58())
        } else if (tokenBMint === "") {
            setTokenBMint(mint.publicKey.toBase58())
        }
    };

    const createLPMint = async () => {
        const [liquidityPoolPDA, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from("liquidity_pool"), new PublicKey(tokenAMint).toBuffer(), new PublicKey(tokenBMint).toBuffer()],
            program.programId
        );
        // Create LP Token
        const lpMint = Keypair.generate();
        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const transaction = new Transaction();

        transaction.add(
            SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: lpMint.publicKey,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(
                lpMint.publicKey,
                0,
                liquidityPoolPDA,
                null,
                TOKEN_PROGRAM_ID
            )
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = publicKey;

        const sig = await sendTransaction(transaction, connection, {signers: [lpMint]});
        setLpMint(lpMint.publicKey.toBase58());
        console.log("LP MINT Created:", lpMint.publicKey, sig);
    }

    const handleCreatePool = async () => {

        if (!connection || !publicKey) {
            return;
        }

        function sortTokens(
            tokenA: PublicKey,
            tokenB: PublicKey
        ): {
            sortedTokenA: PublicKey;
            sortedTokenB: PublicKey;
        } {
            if (tokenA.toBuffer().compare(tokenB.toBuffer()) < 0) {
                return {
                    sortedTokenA: tokenA,
                    sortedTokenB: tokenB,
                };
            } else {
                return {
                    sortedTokenA: tokenB,
                    sortedTokenB: tokenA,
                };
            }
        }

        const { sortedTokenA, sortedTokenB } = sortTokens(new PublicKey(tokenAMint), new PublicKey(tokenBMint));

        const [liquidityPoolPDA, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from("liquidity_pool"), new PublicKey(sortedTokenA).toBuffer(), new PublicKey(sortedTokenB).toBuffer()],
            program.programId
        );

        const [lpTokenA] = derivePDA(program.programId, [
            Buffer.from('pool_token_a'),
            new PublicKey(sortedTokenA).toBuffer(),
        ]);

        const [lpTokenB] = derivePDA(program.programId, [
            Buffer.from('pool_token_b'),
            new PublicKey(sortedTokenB).toBuffer(),
        ]);

        console.log("Token A Mint:", sortedTokenA);
        console.log("Token B Mint:", sortedTokenB);
        console.log("LP Mint:", lpMint);
        console.log("Liquidity Pool PDA:", liquidityPoolPDA.toBase58());




        await program.methods
            .initialize()
            .accounts({
                liquidityPool: liquidityPoolPDA,
                tokenAMint: new PublicKey(sortedTokenA),
                tokenBMint: new PublicKey(sortedTokenB),
                lpToken: new PublicKey(lpMint),
                lpTokenA: new PublicKey(lpTokenA),
                lpTokenB: new PublicKey(lpTokenB),
                user: publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([])
            .rpc();


    }


    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <p>Connected? {wallet ? "Yes" : "No"}</p>
            <p>{wallet?.publicKey ? wallet?.publicKey.toBase58() : "No wallet connected"}</p>

            {
                !tokenAMint && (
                <button onClick={createMint}>
                    Mint
                </button>
                )
            }
            <p>Token A Mint: {tokenAMint || "Not Yet Minted"}</p>
            {
                !tokenBMint && (
                    <button onClick={createMint}>
                        Mint
                    </button>
                )
            }
            <p>Token B Mint: {tokenBMint || "Not Yet Minted"}</p>
            {
                tokenAMint && tokenBMint && !lpMint &&(
                    <button onClick={createLPMint}>
                        Create LP Mint
                    </button>
                )
            }
            <p>LP Mint: {lpMint || "Not Yet Minted"}</p>

            {
                tokenAMint && tokenBMint && lpMint && (
                    <button onClick={handleCreatePool}>
                        Create LP
                    </button>
                )
            }
        </div>
    );
}
