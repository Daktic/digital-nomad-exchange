import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import idl from "../../onchain/target/idl/digital_nomad_exchange.json";
import { createMint } from "@solana/spl-token"; // Assuming you're using spl-token's createMint

const network = "https://api.devnet.solana.com";
const connection = new Connection(network, "processed");

// Generic sort function for two PublicKeys
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

// Get provider from wallet
function getProvider(wallet: any): any {
    return new AnchorProvider(connection, wallet, {
        preflightCommitment: "singleGossip",
    });
}

const programId = new PublicKey("HFMM2nW3ARsBFEKsQnx5mxrTThMKiMGkyETeJ5i2zgNx");

const patchedIdl = {
    ...idl,
    accounts: idl.accounts.map((acct: any) => {
        if (acct.name === "LiquidityPool" && acct.size === undefined) {
            return { ...acct, size: 8 + 32 * 6 };
        }
        return acct;
    }),
};

const createLiquidityPool = async (wallet: any) => {
    // Initialize provider & program
    const provider = getProvider(wallet);
    const connection = provider.connection;
    const program = new Program(patchedIdl, programId, provider);

    // Create token mints for token A and token B
    const tokenA = await createMint(connection, wallet, wallet.publicKey, null, 9);
    const tokenB = await createMint(connection, wallet, wallet.publicKey, null, 9);

    // Sort tokens (your sortTokens function should return the tokens in a consistent order)
    const { sortedTokenA, sortedTokenB } = sortTokens(tokenA, tokenB);

    // Create an LP token mint (this will represent the liquidity pool token)
    const lpTokenMint = await createMint(connection, wallet, wallet.publicKey, null, 9);

    // Derive PDA for the liquidity pool account using seeds defined in your IDL:
    // Seed: "liquidity_pool", sortedTokenA, sortedTokenB
    const [liquidityPoolPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("liquidity_pool"),
            sortedTokenA.toBuffer(),
            sortedTokenB.toBuffer(),
        ],
        programId
    );

    // Derive PDA for the LP token account for token A using seeds:
    // Seed: "pool_token_a", sortedTokenA
    const [lpTokenAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_token_a"), sortedTokenA.toBuffer()],
        programId
    );

    // Derive PDA for the LP token account for token B using seeds:
    // Seed: "pool_token_b", sortedTokenB
    const [lpTokenBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_token_b"), sortedTokenB.toBuffer()],
        programId
    );

    try {
        // Call your program's initialize instruction
        const tx = await program.methods
            .intalize()
            .accounts({
                liquidityPool: liquidityPoolPda,
                tokenAMint: sortedTokenA,
                tokenBMint: sortedTokenB,
                lpToken: lpTokenMint,
                lpTokenA: lpTokenAPda,
                lpTokenB: lpTokenBPda,
                user: wallet.publicKey,
                tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            }).rpc();
        console.log("Liquidity pool created, tx:", tx);

    } catch (error) {
        console.error("Error initializing liquidity pool:", error);
    }
};

export { createLiquidityPool };
