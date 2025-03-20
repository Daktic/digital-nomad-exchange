import styles from "./Pages.module.css";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import idl from "../../../onchain/target/idl/digital_nomad_exchange.json";
import type { DigitalNomadExchange } from "../../../onchain/target/types/digital_nomad_exchange";
import { PublicKey, Connection } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import { useState, useEffect } from "react";
import bs58 from "bs58";
import { Buffer } from "buffer";

// Ensure this matches your IDL program address
const programID = new PublicKey(idl.address);

// Compute the LiquidityPool discriminator
const discriminator = Buffer.from(sha256.digest("account:LiquidityPool")).slice(0, 8);
console.log("LiquidityPool Discriminator:", discriminator);

// Async function to get liquidity pool accounts
async function getLiquidityPools(connection: Connection, programID: PublicKey) {
    const accounts = await connection.getProgramAccounts(programID, {
        filters: [
            {
                memcmp: {
                    offset: 0,
                    bytes: bs58.encode(discriminator),
                },
            },
        ],
    });
    return accounts;
}

type liquidtyPoolDisplay = {
    pool: string;
    tokenA: string;
    tokenB: string;
    lpTokenA: string;
    lpTokenB: string;
    lpToken: string;
    owner: string;
};

export default function Portfolio() {
    const { sendTransaction, publicKey } = useWallet();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    setProvider(provider);

    const program = new Program(idl as DigitalNomadExchange, provider);

    // We'll store the pool accounts as an array of objects
    const [liquidityPools, setLiquidityPools] = useState<
        liquidtyPoolDisplay[]
    >([]);

    useEffect(() => {
        async function fetchPools() {
            const pools = await getLiquidityPools(connection, programID);
            console.log("Pools:", pools);

            // Map each account to an object with its pubkey and raw data
            let poolMetaPromise = pools.map(async (pool) => {
                const accountData = pool.account.data;
                const tokenA = new PublicKey(accountData.slice(8, 40));
                const tokenB = new PublicKey(accountData.slice(40, 72));
                const lpTokenA = new PublicKey(accountData.slice(72, 104));
                const lpTokenB = new PublicKey(accountData.slice(104, 136));
                const lpToken = new PublicKey(accountData.slice(136, 168));
                const owner = new PublicKey(accountData.slice(168, 200));

                const poolMeta: liquidtyPoolDisplay = {
                    pool: pool.pubkey.toBase58(),
                    tokenA: tokenA.toBase58(),
                    tokenB: tokenB.toBase58(),
                    lpTokenA: lpTokenA.toBase58(),
                    lpTokenB: lpTokenB.toBase58(),
                    lpToken: lpToken.toBase58(),
                    owner: owner.toBase58(),
                };

                console.log("Fetched Pool Data:", poolMeta);
                return poolMeta;
            });

            const poolMeta: liquidtyPoolDisplay[] = await Promise.all(poolMetaPromise);
            console.log("Pool Metadata:", poolMeta);

            setLiquidityPools(poolMeta);
        }

        if (connection && wallet) {
            fetchPools();
        }
    }, [connection, wallet]);

    return (
        <div className={styles.page}>
            <h1>Portfolio</h1>
            <p>Connected? {wallet ? "Yes" : "No"}</p>
            <p>{wallet?.publicKey ? wallet?.publicKey.toBase58() : "No wallet connected"}</p>

            {liquidityPools.map((lp, index) => (
                <div key={index}>
                    <p>Pool {lp.pool}</p>
                    <p>Token A: {lp.tokenA}</p>
                    <p>Token B: {lp.tokenB}</p>
                    <p>LP Token: {lp.lpToken}</p>
                </div>
            ))}
        </div>
    );
}
