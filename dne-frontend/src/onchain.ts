import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
    Connection,
    SystemProgram,
    Keypair,
    Transaction, PublicKey
} from "@solana/web3.js";
import idl from "../../onchain/target/idl/digital_nomad_exchange.json";
import { DigitalNomadExchange } from "../../onchain/target/types/digital_nomad_exchange";
import {
    createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID
} from "@solana/spl-token";



// Define network and connection
const network = "https://api.devnet.solana.com";
const connection = new Connection(network, "confirmed");

// Function to get provider from wallet
function getProvider(wallet: any): AnchorProvider {
    return new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
    });
}


const mintToken = async (wallet: any) => {
    console.log(wallet)


    const mintKeypair = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    const walletPubKey = new PublicKey(wallet.address)

    // Create token mints for token A and token B
    const transaction = new Transaction().add(
        // Create the account
        SystemProgram.createAccount({
            fromPubkey: walletPubKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        // Initialize the mint
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            9, // Decimals
            walletPubKey, // Mint authority
            walletPubKey  // Freeze authority (optional)
        )
    );
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubKey;

    const provider = getProvider(wallet);

    transaction.partialSign(mintKeypair);
    const signature = await provider.sendAndConfirm(transaction, [walletPubKey]);


    console.log(signature)
}


// Define program
const pubkeyStr = "HFMM2nW3ARsBFEKsQnx5mxrTThMKiMGkyETeJ5i2zgNx";
const programId = new PublicKey(pubkeyStr);

// Initialize the program interface with the IDL, program ID, and provider
export const initializeProgram = (wallet: any): Program => {
    const provider = getProvider(wallet);
    return new Program<DigitalNomadExchange>(idl as DigitalNomadExchange, provider);
};

// Function to create a liquidity pool
const createLiquidityPool = async (wallet: any) => {
    // Initialize provider & program
    const program = initializeProgram(wallet);

    // TODO, handle no wallet connected
    console.log(wallet)


    // // Sort tokens to maintain consistent order
    // const { sortedTokenA, sortedTokenB } = sortTokens(tokenA, tokenB);
    //
    // // Create an LP token mint
    // const lpTokenMint = await createMint(connection, wallet, wallet.address, null, 9);
    //
    // // Derive PDAs for the liquidity pool and token accounts
    // const [liquidityPoolPda] = PublicKey.findProgramAddressSync(
    //     [
    //         Buffer.from("liquidity_pool"),
    //         sortedTokenA.toBuffer(),
    //         sortedTokenB.toBuffer(),
    //     ],
    //     programId
    // );
    //
    // const [lpTokenAPda] = PublicKey.findProgramAddressSync(
    //     [Buffer.from("pool_token_a"), sortedTokenA.toBuffer()],
    //     programId
    // );
    //
    // const [lpTokenBPda] = PublicKey.findProgramAddressSync(
    //     [Buffer.from("pool_token_b"), sortedTokenB.toBuffer()],
    //     programId
    // );
    //
    // try {
    //     // Call the program's initialize instruction
    //     const tx = await program.methods
    //         .initialize() // Ensure this matches your program's method name
    //         .accounts({
    //             liquidityPool: liquidityPoolPda,
    //             tokenAMint: sortedTokenA,
    //             tokenBMint: sortedTokenB,
    //             lpToken: lpTokenMint,
    //             lpTokenA: lpTokenAPda,
    //             lpTokenB: lpTokenBPda,
    //             user: wallet.publicKey,
    //             tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    //             systemProgram: SystemProgram.programId,
    //             rent: SYSVAR_RENT_PUBKEY,
    //         })
    //         .rpc();
    //     console.log("Liquidity pool created, tx:", tx);
    // } catch (error) {
    //     console.error("Error initializing liquidity pool:", error);
    // }
};

// Generic sort function for two PublicKeys
const sortTokens = (
    tokenA: PublicKey,
    tokenB: PublicKey
): {
    sortedTokenA: PublicKey;
    sortedTokenB: PublicKey;
} => {
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
};

export { createLiquidityPool, mintToken };
