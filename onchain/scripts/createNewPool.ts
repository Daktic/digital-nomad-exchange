// This file is to be used as a helper module
// We will do things like create Tokens and Pools
// We can then use our frontend to do actions to the pools


import * as anchor from "@coral-xyz/anchor";
import {Account, createMint, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {DigitalNomadExchange} from "../target/types/digital_nomad_exchange";
import {Program} from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";



const main = async () => {

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;
    let user_account: anchor.web3.Keypair;
    let tokenA!: anchor.web3.PublicKey;
    let tokenB!: anchor.web3.PublicKey;
    let userTokenAccountA!: Account;
    let userTokenAccountB!: Account;
    let lpToken: anchor.web3.PublicKey;
    let liquidityPoolPda!: anchor.web3.PublicKey;
    let bump: number;
    let userAssociatedLPToken: Account;
    let lpTokenAccountA!: anchor.web3.PublicKey;
    let lpTokenAccountB!: anchor.web3.PublicKey;

    // Generic sort function for two PublicKeys
    function sortTokens(
        tokenA: anchor.web3.PublicKey,
        tokenB: anchor.web3.PublicKey
    ): {
        sortedTokenA: anchor.web3.PublicKey;
        sortedTokenB: anchor.web3.PublicKey;
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

    async function createMints() {
        tokenA = await createMint(provider.connection, user_account, user_account.publicKey, null, 9);
        tokenB = await createMint(provider.connection, user_account, user_account.publicKey, null, 9);
    }


    async function createAssociatedTokenAccounts() {
        console.log("Creating associated token accounts");
        userTokenAccountA = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenA,
            user_account.publicKey
        );
        userTokenAccountB = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenB,
            user_account.publicKey
        );
    }

    function derivePDAAddresses() {
        console.log("Deriving PDA addresses");
        const [_liquidityPoolPda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("liquidity_pool"), tokenA.toBuffer(), tokenB.toBuffer()],
            program.programId
        );
        liquidityPoolPda = _liquidityPoolPda;
        bump = _bump;

        // Derive LP token PDAs using the sorted mints
        const [lpTokenAPda, lpTokenABump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_token_a"), tokenA.toBuffer()],
            program.programId
        );
        const [lpTokenBPda, lpTokenBBump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_token_b"), tokenB.toBuffer()],
            program.programId
        );
        lpTokenAccountA = lpTokenAPda;
        lpTokenAccountB = lpTokenBPda;
    }

    function logVariables() {
        console.log(`User Account: ${user_account.publicKey}`);
        console.log(`Program ID: ${program.programId}`);
        console.log(`Token A: ${tokenA.toBase58()}`);
        console.log(`Token B: ${tokenB.toBase58()}`);
        console.log(`User Token Account A: ${userTokenAccountA.address.toBase58()}`);
        console.log(`User Token Account B: ${userTokenAccountB.address.toBase58()}`);
        console.log(`LP Token Account A: ${lpTokenAccountA.toBase58()}`);
        console.log(`LP Token Account B: ${lpTokenAccountB.toBase58()}`);
        console.log(`LP Token: ${lpToken.toBase58()}`);
        console.log(`Liquidity Pool PDA: ${liquidityPoolPda.toBase58()}`);
        console.log(`Bump: ${bump}`);
    }

    user_account = (provider.wallet as NodeWallet).payer;

    // Create mints
    await createMints();

    // --- Sort mints so that tokenA is the lower (canonical) mint ---
    const sortedMints = sortTokens(tokenA, tokenB);
    tokenA = sortedMints.sortedTokenA;
    tokenB = sortedMints.sortedTokenB;

    // Create associated token accounts for the user using the sorted mints
    await createAssociatedTokenAccounts();

    // Create LP token mint
    lpToken = await createMint(provider.connection, user_account, user_account.publicKey, null, 9);

    // Derive the liquidity pool PDA using the sorted mints
    derivePDAAddresses();

    logVariables();

    // Init the PDA
    await program.methods.initializePda()
        .accountsStrict({
            liquidityPool: liquidityPoolPda,
            tokenAMint: tokenA,
            tokenBMint: tokenB,
            user: user_account.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user_account])
        .rpc();

    // Initialize the liquidity pool on-chain with sorted values
    await program.methods.initialize()
        .accountsStrict({
            liquidityPool: liquidityPoolPda,
            tokenAMint: tokenA,
            tokenBMint: tokenB,
            lpToken: lpToken,
            lpTokenA: lpTokenAccountA,
            lpTokenB: lpTokenAccountB,
            user: user_account.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user_account])
        .rpc();
}

main().catch((err) => {
    console.error("Error running script:", err);
    process.exit(1);
});