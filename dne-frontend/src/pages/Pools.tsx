import styles from "./Pages.module.css";
import {PoolCard} from "../components/poolCard/PoolCard.tsx";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import idl from "../../../onchain/target/idl/digital_nomad_exchange.json";
import type { DigitalNomadExchange } from "../../../onchain/target/types/digital_nomad_exchange";
import { PublicKey, Connection } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import { useState, useEffect } from "react";
import bs58 from "bs58";
import { Buffer } from "buffer";
import {getTokenMetadata} from "@solana/spl-token";
import {Pool, liquidtyPoolDisplay} from "../types.ts";

const programID = new PublicKey(idl.address);



// Async function to get liquidity pool accounts
async function getLiquidityPools(connection: Connection, programID: PublicKey) {
    // Compute the LiquidityPool discriminator
    const discriminator = Buffer.from(sha256.digest("account:LiquidityPool")).slice(0, 8);
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

const Pools = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    setProvider(provider);

    const program = new Program(idl as DigitalNomadExchange, provider);


    // We'll store the pool accounts as an array of objects
    const [liquidityPools, setLiquidityPools] = useState<
        liquidtyPoolDisplay[]
    >([]);

    const [cardDisplay, setCardDisplay] = useState<Pool[]>([]);

    useEffect(() => {
        async function fetchPools() {
            const pools = await getLiquidityPools(connection, programID);


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

                return poolMeta;
            });

            const poolMeta: liquidtyPoolDisplay[] = await Promise.all(poolMetaPromise);
            setLiquidityPools(poolMeta);
        }

        if (connection && wallet) {
            fetchPools();
        }
    }, [connection, wallet]);

    // This will run once pools are grabbed, and then get the token metadata to populate the pool cards
    useEffect(() => {
        const fetchTokenMetadata = async () => {
            try {
                for (const lp of liquidityPools) {
                    const mintA = new PublicKey(lp.tokenA);
                    const metadataA = await getTokenMetadata(connection, mintA);
                    console.log("Token A Metadata:", metadataA);
                    const mintB = new PublicKey(lp.tokenB);
                    const metadataB = await getTokenMetadata(connection, mintB);
                    const poolData:Pool = {
                        address: lp.pool,
                        tokenA: {
                            symbol: metadataA?.symbol,
                            name: metadataA?.name,
                            token_img: metadataA?.uri,
                            address: lp.tokenA,
                        },
                        tokenB: {
                            symbol: metadataB?.symbol,
                            name: metadataB?.name,
                            token_img: metadataB?.uri,
                            address: lp.tokenB,
                        },
                        lpToken: {
                            symbol: `${metadataA?.symbol}-${metadataB?.symbol}`,
                            name: `${metadataA?.symbol}-${metadataB?.symbol} LP Token`,
                            token_img: "https://picsum.photos/50",
                            address: lp.lpToken,
                        },
                        symbol: `${metadataA?.symbol}-${metadataB?.symbol}`,
                    };
                    setCardDisplay((prevCardDisplay) => [...prevCardDisplay, poolData]);
                }
            } catch (error) {
                console.error("Error fetching token metadata:", error);
            }
        };

        fetchTokenMetadata();
    }, [liquidityPools]);

    return (
        <div className={styles.page}>
            <h1>Pools</h1>
            {/*This will later return fetched assets*/}
            {cardDisplay.map((pool, index) => (
            //     Pool Card
                <PoolCard key={index} pool={pool} />
            ))}
        </div>
    )
}
export default Pools;