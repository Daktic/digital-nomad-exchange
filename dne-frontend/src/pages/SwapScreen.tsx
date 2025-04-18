import styles from "./Pages.module.css";
import SwapBar, {ButtonBar, LPTokenSection, SwitchBar} from "../components/swapBar/SwapBar.tsx";
import {useEffect, useState} from "react";
import {Connection, PublicKey, Transaction} from "@solana/web3.js";
import {sha256} from "js-sha256";
import bs58 from "bs58";
import {liquidtyPoolDisplay, Pool} from "../types.ts";
import {AnchorProvider, Program, setProvider} from "@coral-xyz/anchor";
import {useAnchorWallet, useConnection} from "@solana/wallet-adapter-react";
import idl from "../../../onchain/target/idl/digital_nomad_exchange.json";
import type {DigitalNomadExchange} from "../../../onchain/target/types/digital_nomad_exchange.ts";
import {Buffer} from "buffer";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    getTokenMetadata,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import {ASSOCIATED_PROGRAM_ID} from "@coral-xyz/anchor/dist/cjs/utils/token";
import * as anchor from "@coral-xyz/anchor";
import {SYSTEM_PROGRAM_ID} from "@coral-xyz/anchor/dist/cjs/native/system";
import {notifyWithLink, ToastNotificaiton} from "../components/toastNotification/ToastNotificaiton.tsx";
import {toast} from "react-toastify";

const fee = 0.003;

interface AssociatedAddresses {
    userTokenAccountA: PublicKey;
    userTokenAccountB: PublicKey;
    userTokenAccountLP: PublicKey;
    lpTokenAPda: PublicKey;
    lpTokenBPda: PublicKey;
}
const getAssociatedAddresses = async (
    program:any,
    tokenA:PublicKey,
    tokenB:PublicKey,
    lpToken:PublicKey,
    user:PublicKey,

                                ): Promise<AssociatedAddresses> => {

    const userTokenAccountA = await getAssociatedTokenAddress(
        tokenA,
        user,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_PROGRAM_ID
    );

    const userTokenAccountB = await getAssociatedTokenAddress(
        tokenB,
        user,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_PROGRAM_ID
    );

    const userTokenAccountLP = await getAssociatedTokenAddress(
        lpToken,
        user,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_PROGRAM_ID
    );

    const [lpTokenAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_token_a"), tokenA.toBuffer()],
        program.programId
    );
    const [lpTokenBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_token_b"), tokenB.toBuffer()],
        program.programId
    );

    return {
        userTokenAccountA,
        userTokenAccountB,
        userTokenAccountLP,
        lpTokenAPda,
        lpTokenBPda
    }

}

const Swap = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    setProvider(provider);

    const program = new Program(idl as DigitalNomadExchange, provider);

    // Get the current URL
    const currentUrl = window.location.href;

    // Create a URL object
    const url = new URL(currentUrl);

    // Use URLSearchParams to get the query parameters
    const params = new URLSearchParams(url.search);

    // Get the value of the 'pool' parameter
    const poolAddressQueryParam = params.get('pool');


    const [poolAddress, setPoolAddress] = useState(poolAddressQueryParam);
    const [swapOrSupply, setSwapOrSupply] = useState(false);

    const [poolMetaData, setPoolMetaData] = useState<Pool | null>(null);

    const [tokenAAmount, setTokenAAmount] = useState(0);
    const [tokenBAmount, setTokenBAmount] = useState(0);
    const [lpTokenAmount, setLPTokenAmount] = useState(0);

    const [tokenAReserve, setTokenAReserve] = useState(1000);
    const [tokenBReserve, setTokenBReserve] = useState(500);
    const [lpReserve, setReserve] = useState(Math.sqrt(1000 * 500));

    const handleTokenAInput = (newAmount: number) => {
        setTokenAAmount(newAmount);
        // If Token A changes, update others
        let swap: AnySwap;
        if (swapOrSupply) {
            swap = {
                tokenAAmount: newAmount,
                tokenBAmount: tokenBAmount,
                lpAmount: lpTokenAmount,
                swapType:swapType.ABforLP,
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                lpTotalSupply: lpReserve
            }

        } else {
            swap = {
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                swapAmount: newAmount,
                fee: fee,
                lpTotalSupply: lpReserve,
                swapType: swapType.AforB
            }
        }

        console.log("Swap", swap);
        const newState = calculateTokenAmounts(swap)
        console.log("New State", newState);
        setTokenBAmount(newState.tokenBAmount);
        setLPTokenAmount(newState.lpAmount);
    }

    const handleTokenBInput = (newAmount: number) => {
        setTokenBAmount(newAmount);
        let swap: AnySwap;
        if (swapOrSupply) {
            swap = {
                tokenAAmount: tokenAAmount,
                tokenBAmount: newAmount,
                lpAmount: lpTokenAmount,
                swapType:swapType.BAforLP,
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                lpTotalSupply: lpReserve
            }

        } else {
            swap = {
                tokenAReserve: tokenAReserve,
                tokenBReserve: tokenBReserve,
                swapAmount: newAmount,
                fee:fee,
                lpTotalSupply: lpReserve,
                swapType:swapType.BforA
            }
        }
        // If Token A changes, update others
        const newState = calculateTokenAmounts(swap)

        setTokenAAmount(newState.tokenAAmount);
        setLPTokenAmount(newState.lpAmount);
    }

    const handleLPTokenInput = (newAmount: number) => {
        setLPTokenAmount(newAmount);
        const newState = calculateTokenAmounts({
            tokenAAmount: tokenAAmount,
            tokenBAmount: tokenBAmount,
            lpAmount: newAmount,
            swapType:swapType.LPforAB,
            tokenAReserve: tokenAReserve,
            tokenBReserve: tokenBReserve,
            lpTotalSupply: lpReserve
        })
        setTokenAAmount(newState.tokenAAmount);
        setTokenBAmount(newState.tokenBAmount);
    }

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

    async function fetchPoolData(connection: Connection, programID: PublicKey, poolAddress: string) {
        let accounts = await getLiquidityPools(connection, programID)
        accounts = accounts.filter((account) => account.pubkey.toBase58() === poolAddress);

        if (accounts.length === 0) {
            throw new Error("Pool not found");
        }

        const pool = accounts[0];
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
    }

    useEffect(() => {
        async function fetchSinglePool() {
            console.log(poolAddress);
            try {
                return await fetchPoolData(provider.connection, program.programId, poolAddress);
            } catch (error) {
                console.error("Error fetching single pool data:", error);
            }
        }

        const fetchTokenMetaData = async () => {
            try {
                const lp = await fetchSinglePool();
                if (lp) {
                    const lpBalanceA = await provider.connection.getTokenAccountBalance(new PublicKey(lp.lpTokenA));
                    const lpBalanceB = await provider.connection.getTokenAccountBalance(new PublicKey(lp.lpTokenB));
                    const lpTotalSupply = await connection.getTokenSupply(new PublicKey(lp.lpToken));

                    console.log(lpTotalSupply);

                    setTokenAReserve(Number(lpBalanceA.value.amount));
                    setTokenBReserve(Number(lpBalanceB.value.amount));
                    setLPTokenAmount(Number(lpTotalSupply.value.amount));


                    const mintA = new PublicKey(lp.tokenA);
                    const metadataA = await getTokenMetadata(connection, mintA);
                    const mintB = new PublicKey(lp.tokenB);
                    const metadataB = await getTokenMetadata(connection, mintB);
                    const lpMint = new PublicKey(lp.lpToken);
                    const metadataLP = await getTokenMetadata(connection, lpMint);

                    const poolData: Pool = {
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
                            token_img: metadataLP?.uri,
                            address: lp.lpToken,
                        },
                        symbol: `${metadataA?.symbol}-${metadataB?.symbol}`,
                    };

                    setPoolMetaData(poolData);
                }
            } catch (error) {
                console.error("Error fetching token metadata:", error);
            }
        }
        if (connection && wallet) {
            fetchTokenMetaData();
        }
    }, [poolAddress, wallet, connection]);

    enum PoolAction {
        Swap = "swap",
        AddLiquidity = "addLiquidity",
        RemoveLiquidity = "removeLiquidity"
    }

    interface poolActionProps {
        tokenAMint: PublicKey;
        tokenBMint: PublicKey;
        lpTokenMint: PublicKey;
        poolPublicKey: PublicKey;
        walletPublicKey: PublicKey;
        userTokenAccountA: PublicKey;
        userTokenAccountB: PublicKey;
        userTokenAccountLP?: PublicKey;
        lpTokenAPda: PublicKey;
        lpTokenBPda: PublicKey;
        lpTokenLPPDA: PublicKey;
    }

    const handlePoolAction = async (action:PoolAction) => {
        if (!wallet || !poolAddress || !poolMetaData) {
            console.error("Wallet or pool address is missing");
            return;
        }

        const mintAPub =  new PublicKey(poolMetaData.tokenA.address);
        const mintBPub = new PublicKey(poolMetaData.tokenB.address);
        const lpTokenPub = new PublicKey(poolMetaData.lpToken.address);
        const walletPub = new PublicKey(wallet.publicKey);
        const poolPub = new PublicKey(poolAddress);

        const {
            userTokenAccountA,
            userTokenAccountB,
            lpTokenAPda,
            lpTokenBPda,
        } = await getAssociatedAddresses(
            program,
            mintAPub,
            mintBPub,
            lpTokenPub,
            walletPub
        );

        // Get associated LP account
        const userTokenAccountLP = await getAssociatedTokenAddress(
            lpTokenPub,
            walletPub,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_PROGRAM_ID
        );

        console.log("userTokenAccountA", userTokenAccountA.toBase58());
        console.log("userTokenAccountB", userTokenAccountB.toBase58());
        console.log("lpTokenAPda", lpTokenAPda.toBase58());
        console.log("lpTokenBPda", lpTokenBPda.toBase58());

        const poolProps:poolActionProps = {
            poolPublicKey: poolPub,
            walletPublicKey: walletPub,
            tokenAMint: mintAPub,
            tokenBMint: mintBPub,
            lpTokenMint: lpTokenPub,
            userTokenAccountA,
            userTokenAccountB,
            lpTokenAPda,
            lpTokenBPda,
            userTokenAccountLP
        }

        if (action === PoolAction.Swap) {
            await handleSwap(poolProps);
        } else if (action === PoolAction.AddLiquidity) {
            // Get the user's LP token account

            await handleAddLiquidity(poolProps);
        } else if (action === PoolAction.RemoveLiquidity) {
            await handleRemoveLiquidity(poolProps);
        }
    }

    const handleSwap = async (props:poolActionProps) => {

        try {
            const transaction = new Transaction();

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = props.walletPublicKey;

            transaction.add(
                await program.methods
                    .swapTokens(
                        new anchor.BN(tokenAAmount * 10 ** 9),
                        false,
                    )
                    .accountsStrict({
                        liquidityPool: props.poolPublicKey,
                        mintA: props.tokenAMint,
                        userTokenA: props.userTokenAccountA,
                        mintB: props.tokenBMint,
                        userTokenB: props.userTokenAccountB,
                        lpTokenA: props.lpTokenAPda,
                        lpTokenB: props.lpTokenBPda,
                        lpToken: props.lpTokenMint,
                        user: props.walletPublicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    }).instruction()
            );

            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await provider.connection.sendRawTransaction(signedTransaction.serialize());
            notifyWithLink(signature);
        } catch (error) {
            toast.error("Transaction failed. Please try again.");
            console.error("Transaction failed:", error);
        }
    }

    const handleAddLiquidity = async (props:poolActionProps) => {
        console.log("Add Liquidity");

        try {
            const transaction = new Transaction();

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = props.walletPublicKey;

            const accountExists = await connection.getAccountInfo(props.userTokenAccountLP);

            if (!accountExists) {
                // Create the account for the user
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        props.walletPublicKey,
                        props.userTokenAccountLP,
                        props.walletPublicKey,
                        props.lpTokenMint,
                        TOKEN_2022_PROGRAM_ID,
                        ASSOCIATED_PROGRAM_ID
                    )
                );
            }

            // Add liquidity to the pool
            transaction.add(
                await program.methods
                    .addLiquidity(
                        new anchor.BN(tokenAAmount * 10 ** 9),
                        new anchor.BN(tokenBAmount * 10 ** 9),
                    )
                    .accountsStrict({
                        liquidityPool: props.poolPublicKey,
                        mintA: props.tokenAMint,
                        userTokenA: props.userTokenAccountA,
                        mintB: props.tokenBMint,
                        userTokenB: props.userTokenAccountB,
                        lpTokenA: props.lpTokenAPda,
                        lpTokenB: props.lpTokenBPda,
                        lpToken: props.lpTokenMint,
                        userLpTokenAccount: props.userTokenAccountLP,
                        user: props.walletPublicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    }).instruction()
            );

            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await provider.connection.sendRawTransaction(signedTransaction.serialize());
            notifyWithLink(signature);
        } catch (error) {
            toast.error("Transaction failed. Please try again.");
            console.error("Transaction failed:", error);
        }
    }

    const handleRemoveLiquidity = async (props:poolActionProps) => {
        console.log("Remove Liquidity");

        try {
            const transaction = new Transaction();

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = props.walletPublicKey;


            const accountAExists = await connection.getAccountInfo(props.userTokenAccountA);
            const accountBExists = await connection.getAccountInfo(props.userTokenAccountB);

            if (!accountAExists) {
                // Create the account for the user
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        props.walletPublicKey,
                        props.userTokenAccountLP,
                        props.walletPublicKey,
                        props.lpTokenMint,
                        TOKEN_2022_PROGRAM_ID,
                        ASSOCIATED_PROGRAM_ID
                    )
                );
            } else if (!accountBExists) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        props.walletPublicKey,
                        props.userTokenAccountLP,
                        props.walletPublicKey,
                        props.lpTokenMint,
                        TOKEN_2022_PROGRAM_ID,
                        ASSOCIATED_PROGRAM_ID
                    )
                );
            }

            transaction.add(
                await program.methods
                    .removeLiquidity(
                        new anchor.BN(lpTokenAmount * 10 ** 9),
                    )
                    .accountsStrict({
                        liquidityPool: props.poolPublicKey,
                        mintA: props.tokenAMint,
                        userTokenA: props.userTokenAccountA,
                        mintB: props.tokenBMint,
                        userTokenB: props.userTokenAccountB,
                        lpTokenA: props.lpTokenAPda,
                        lpTokenB: props.lpTokenBPda,
                        lpToken: props.lpTokenMint,
                        userLpTokenAccount: props.userTokenAccountLP,
                        user: props.walletPublicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    }).instruction()
            );

            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await provider.connection.sendRawTransaction(signedTransaction.serialize());
            notifyWithLink(signature);
        } catch (error) {
            toast.error("Transaction failed. Please try again.");
            console.error("Transaction failed:", error);
        }

    }

    return (
        <div className={styles.page}>
            <SwitchBar checked={swapOrSupply} setChecked={setSwapOrSupply} />
            <div className={styles.swapBarContainer}>
                {poolMetaData &&
                    <SwapBar
                        tokenA={poolMetaData.tokenA}
                        tokenB={poolMetaData.tokenB}
                        tokenAAmount={tokenAAmount}
                        tokenBAmount={tokenBAmount}
                        lpAmount={lpTokenAmount}
                        handleTokenAInput={handleTokenAInput}
                        handleTokenBInput={handleTokenBInput}
                    />
                }

            </div>
            {
                poolMetaData && swapOrSupply ?
                        (
                            <LPTokenSection
                                token={poolMetaData.lpToken}
                                tokenAmount={lpTokenAmount / 10 ** 9}
                                updateFunction={handleLPTokenInput}
                            />
                        )
                : (<div className={styles.spacer}></div>)

            }
            <ButtonBar supply={swapOrSupply}
                       handleSwap={() => handlePoolAction(PoolAction.Swap)}
                       handleAddLiquidity={() => handlePoolAction(PoolAction.AddLiquidity)}
                       handleRemoveLiquidity={() => handlePoolAction(PoolAction.RemoveLiquidity)}
            />
            <ToastNotificaiton />
        </div>
    )
};
export default Swap;


interface BaseSwap {
    swapType:swapType
    tokenAReserve: number;
    tokenBReserve: number;
    lpTotalSupply: number;
}

interface RegularSwap extends BaseSwap {
    swapType: swapType.AforB | swapType.BforA
    swapAmount: number;
    fee:number;
}

interface LiquiditySwap extends BaseSwap {
    swapType: swapType.LPforAB | swapType.ABforLP | swapType.BAforLP
    tokenAAmount: number;
    tokenBAmount: number;
    lpAmount: number;
}

enum swapType {
    AforB=0,
    BforA=1,
    LPforAB=2,
    ABforLP=3,
    BAforLP=4
}

interface swapProduct {
    tokenAAmount: number;
    tokenBAmount: number;
    lpAmount: number;
}

type AnySwap = RegularSwap | LiquiditySwap

const calculateTokenAmounts = (swap: AnySwap): swapProduct  => {
    let newTokenA: number;
    let newTokenB: number;
    let newLp: number;

    console.log(swap)

    if (swap.swapType === 0) {
        newTokenA = swap.tokenAReserve - swap.swapAmount;
        newTokenB =  calulateSwap(swap.tokenAReserve, swap.tokenBReserve, swap.swapAmount, swap.fee);
        newLp = swap.lpTotalSupply;
    } else if (swap.swapType === 1) {
        newTokenA = calulateSwap(swap.tokenBReserve, swap.tokenAReserve, swap.swapAmount, swap.fee);
        newTokenB =  swap.tokenBReserve - swap.swapAmount;
        newLp = swap.lpTotalSupply;
    } else if (swap.swapType === 2 || swap.swapType === 3 || swap.swapType === 4) {
        return calulateAddRemove(swap)
    } else {
        throw new Error("Unrecognized swap type")
    }

    return {
        tokenAAmount: newTokenA,
        tokenBAmount: newTokenB,
        lpAmount: newLp,
    }
};

const calulateSwap = (tokenA:number, tokenB:number, swapAmount:number, fee:number): number => {
    if (swapAmount <= 0 || tokenA <= 0 || tokenB <= 0) return 0;

    const amountAfterFee = swapAmount * (1 - fee);

    return (amountAfterFee * tokenB) /
        (tokenA + amountAfterFee);
}

const calulateAddRemove = (supply: LiquiditySwap): swapProduct => {
    // We assume that the pools have been set up if they exist here. so we can skip accounting for initial deposit math.

    let newTokenA: number;
    let newTokenB: number;
    let newLp: number;

    if (supply.swapType === 2) {
        // LP for AB
        const lpFraction = supply.lpAmount / supply.lpTotalSupply;
        newTokenA = supply.tokenAReserve * lpFraction;
        newTokenB = supply.tokenBReserve * lpFraction;
        newLp = supply.lpTotalSupply-supply.lpAmount;
    } else {
        // AB for LP
        // Have A -> get B and LP
        if (supply.swapType === 3) {
            newTokenA = supply.tokenAAmount;
            newTokenB = supply.tokenAAmount * (supply.tokenBReserve / supply.tokenAReserve);
            newLp = supply.lpTotalSupply * (supply.tokenAAmount / supply.tokenAReserve);
        // Have B -> get A and LP
        } else {
            newTokenA = supply.tokenBAmount * (supply.tokenAReserve / supply.tokenBReserve);
            newTokenB = supply.tokenBAmount;
            newLp = supply.lpTotalSupply * (supply.tokenBAmount / supply.tokenBReserve);
        }
    }
    return {
        tokenAAmount: newTokenA,
        tokenBAmount: newTokenB,
        lpAmount: newLp,
    }
}

