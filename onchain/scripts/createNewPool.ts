import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccount, createMint,
    getAssociatedTokenAddress,
    mintTo,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import {makeTokenMint} from "@solana-developers/helpers"
import {DigitalNomadExchange} from "../target/types/digital_nomad_exchange";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {PublicKey, SystemProgram,} from "@solana/web3.js";
import * as console from "node:console";

const amountToMint = 1000 * 10 ** 9;

// Create a fungible token mint with MPL metadata.
async function createFungibleTokenWithMetadata(provider: anchor.AnchorProvider, metadata: any, signerAccount: anchor.web3.Keypair) {
    return await makeTokenMint(
        provider.connection,
        signerAccount,
        metadata.name,
        metadata.symbol,
        9,
        metadata.uri,
    );
}

async function checkAccountInitialization(provider: anchor.AnchorProvider, account: PublicKey) {
    const mintInfo = await provider.connection.getParsedAccountInfo(account);
    if (!mintInfo.value) {
        throw new Error(`Account ${account.toBase58()} is not initialized`);
    }
}

// Generic sort function for two PublicKeys.
function sortTokens(
    tokenA: PublicKey,
    tokenB: PublicKey
): { sortedTokenA: PublicKey; sortedTokenB: PublicKey } {
    console.log(tokenA.toBase58(), tokenB.toBase58());
    if (tokenA.toBuffer().compare(tokenB.toBuffer()) < 0) {
        return { sortedTokenA: tokenA, sortedTokenB: tokenB };
    } else {
        return { sortedTokenA: tokenB, sortedTokenB: tokenA };
    }
}



async function getAssociatedUserTokenAccounts(provider:anchor.AnchorProvider,
                                              tokenA: PublicKey,
                                              tokenB: PublicKey,
                                              lpToken: PublicKey,
                                              user_account: anchor.web3.Keypair,
                                              wallet_account?: PublicKey
) {
    console.log("Creating associated token accounts");
    await checkAccountInitialization(provider, tokenA);
    await checkAccountInitialization(provider, tokenB);
    console.log("Both tokens initialized");

    let userTokenAccountA: PublicKey;
    let userTokenAccountB: PublicKey;
    let userTokenAccountLP: PublicKey;
    let walletTokenAccountA: PublicKey;

    try {
        userTokenAccountA = new PublicKey(await getAssociatedTokenAddress(
            tokenA,
            user_account.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        ));
        console.log(`User Token Account A: ${userTokenAccountA}`);
    } catch (error) {
        console.error("Error creating associated token account for Token A:", error);
        throw error;
    }

    try {
        userTokenAccountB = new PublicKey(await getAssociatedTokenAddress(
            tokenB,
            user_account.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        ));
        console.log(`User Token Account B: ${userTokenAccountB}`);

    } catch (error) {
        console.error("Error creating associated token account for Token B:", error);
        throw error;
    }

    try {
        userTokenAccountLP = new PublicKey(await getAssociatedTokenAddress(
            lpToken,
            user_account.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        ));
        console.log(`User Token Account LP: ${userTokenAccountLP}`);

    } catch (error) {
        console.error("Error creating associated token account for Token B:", error);
        throw error;
    }

    if (wallet_account) {
        try {
            walletTokenAccountA = new PublicKey(await getAssociatedTokenAddress(
                tokenA,
                wallet_account,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            ));
            console.log(`User walletTokenAccountA: ${userTokenAccountLP}`);
        } catch (error) {
            console.error("Error creating associated token account for Wallet Token A:", error);
            throw error;
        }
    }


    if (!userTokenAccountA || !userTokenAccountB || !userTokenAccountLP) {
        throw new Error("Error creating associated token accounts");
    }
    return {userTokenAccountA, userTokenAccountB, userTokenAccountLP, walletTokenAccountA};
}

function derivePDAAddresses(tokenA: PublicKey, tokenB: PublicKey, program: Program<DigitalNomadExchange>) {
    console.log("Deriving PDA addresses");
    const [liquidityPoolPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("liquidity_pool"), tokenA.toBuffer(), tokenB.toBuffer()],
        program.programId
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
        liquidityPoolPda,
        bump,
        lpTokenAPda,
        lpTokenBPda,
    }
}

const initializePool = async (provider: anchor.AnchorProvider, tokenA: anchor.web3.PublicKey, tokenB: anchor.web3.PublicKey, lpToken: anchor.web3.PublicKey, user_account: anchor.web3.Keypair) => {
    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;

    function logVariables(lpTokenAccountA:anchor.web3.PublicKey, lpTokenAccountB:anchor.web3.PublicKey) {
        const logs = [
            `User Account: ${user_account.publicKey.toBase58()}`,
            `Program ID: ${program.programId.toBase58()}`,
            `Token A: ${tokenA.toBase58()}`,
            `Token B: ${tokenB.toBase58()}`,
            `User Token Account A: ${userTokenAccountA.toBase58()}`,
            `User Token Account B: ${userTokenAccountB.toBase58()}`,
            `LP Token Account A: ${lpTokenAccountA.toBase58()}`,
            `LP Token Account B: ${lpTokenAccountB.toBase58()}`,
            `LP Token (Mint): ${lpToken.toBase58()}`,
            `Liquidity Pool PDA: ${liquidityPoolPda.toBase58()}`,
            `Bump: ${bump}`,
        ];
        logs.forEach((log) => console.log(log));
    }


    // Create associated token accounts for the user using the sorted mints.
    const {userTokenAccountA, userTokenAccountB} = await getAssociatedUserTokenAccounts(provider, tokenA, tokenB, lpToken, user_account);

    // Derive the liquidity pool PDA using the sorted mints.
    const {
        liquidityPoolPda,
        bump,
        lpTokenAPda,
        lpTokenBPda
    } = derivePDAAddresses(tokenA, tokenB, program);

    logVariables(lpTokenAPda, lpTokenBPda);

    // Initialize the PDA on-chain.
    await program.methods.initializePda()
        .accountsStrict({
            liquidityPool: liquidityPoolPda,
            tokenAMint: tokenA,
            tokenBMint: tokenB,
            user: user_account.publicKey,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user_account])
        .rpc();

    // Initialize the liquidity pool on-chain with sorted values.
    await program.methods.initialize()
        .accountsStrict({
            liquidityPool: liquidityPoolPda,
            tokenAMint: tokenA,
            tokenBMint: tokenB,
            lpToken: lpToken,
            lpTokenA: lpTokenAPda,
            lpTokenB: lpTokenBPda,
            user: user_account.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user_account])
        .rpc();
};

const depositIntoPool = async (provider: anchor.AnchorProvider, tokenA: anchor.web3.PublicKey, tokenB: anchor.web3.PublicKey, lpToken:anchor.web3.PublicKey, user_account: anchor.web3.Keypair) => {
    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;

    // Create associated token accounts for the user using the sorted mints.
    const {userTokenAccountA, userTokenAccountB, userTokenAccountLP} = await getAssociatedUserTokenAccounts(provider, tokenA, tokenB, lpToken, user_account);

    // Derive the liquidity pool PDA using the sorted mints.
    const {
        liquidityPoolPda,
        bump,
        lpTokenAPda,
        lpTokenBPda
    } = derivePDAAddresses(tokenA, tokenB, program);

    // Deposit 500 of Token A and Token B into the pool.
    const amountToDeposit = 500 * 10 ** 9;
    await program.methods.addLiquidity(new anchor.BN(amountToDeposit), new anchor.BN(amountToDeposit))
        .accountsStrict({
            liquidityPool: liquidityPoolPda,
            mintA: tokenA,
            userTokenA: userTokenAccountA,
            mintB: tokenB,
            userTokenB: userTokenAccountB,
            lpTokenA: lpTokenAPda,
            lpTokenB: lpTokenBPda,
            lpToken: lpToken,
            userLpTokenAccount: userTokenAccountLP,
            user: user_account.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId
        })
        .signers([user_account])
        .rpc()
}


const main = async () => {

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Get the user account from the provider wallet.
    const user_account = (provider.wallet as NodeWallet).payer;

    // This should be the wallet address of the account doing the swap.
    const wallet_address = new PublicKey("7YZDbhkRFYSFo1xqV5eS8hiairc8rEiVDTWFioBp3ef5")

    // Create mints for Token A and Token B via MPL metadata.
    const tokenAMetadata = {
        name: "USD Coin",
        symbol: "USDC",
        uri: "https://etherscan.io/token/images/usdc_ofc_32.svg",
    };
    let tokenA = await createFungibleTokenWithMetadata(provider, tokenAMetadata, user_account);

    const tokenBMetadata = {
        name: "Tether",
        symbol: "USDT",
        uri: "https://imgs.search.brave.com/3CpFLBfBLgar1MCKskrOhFvyEAweuZ6S41ikpGbNGdc/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9zMy5j/b2ludGVsZWdyYXBo/LmNvbS9zdG9yYWdl/L3VwbG9hZHMvdmll/dy80NWFjODg2ZWNl/MTY0ZmZiYTcxMWU5/YzczYjU5ZDdiOC5w/bmc",
    };
    let tokenB = await createFungibleTokenWithMetadata(provider, tokenBMetadata, user_account);

    // Create LP token mint
    // Can we pass this in?
    const lpTokenMetadata = {
        name: "LP Token",
        symbol: "LPT",
        uri: "https://example.com/lp-metadata.json" // Replace with your LP metadata URI
    };

    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;
    const {liquidityPoolPda} = derivePDAAddresses(tokenA, tokenB, program);
    const lpToken= await createMint(
        provider.connection,
        user_account,
        liquidityPoolPda,
        liquidityPoolPda,
        9,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    // --- Sort mints so that tokenA is the canonical (lower) mint ---
    const sortedMints = sortTokens(tokenA, tokenB);
    tokenA = sortedMints.sortedTokenA;
    tokenB = sortedMints.sortedTokenB;

    // Mint 1,000 of Token A and Token B to the user account.
    try {
        // Create user Token accounts
        let created_token_account = await createAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenA,
            user_account.publicKey,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(`User Token Account A create return value ${new PublicKey(created_token_account).toBase58()}`);

        await createAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenB,
            user_account.publicKey,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        await createAssociatedTokenAccount(
            provider.connection,
            user_account,
            lpToken,
            user_account.publicKey,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        await createAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenA,
            wallet_address,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        await createAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenB,
            wallet_address,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log("Token Accounts created successfully");

        const {userTokenAccountA, userTokenAccountB, walletTokenAccountA} = await getAssociatedUserTokenAccounts(provider, tokenA, tokenB, lpToken, user_account, wallet_address);


        // Mint tokens to user account
        await mintTo(
            provider.connection,
            user_account,
            tokenA,
            userTokenAccountA,
            user_account.publicKey,
            amountToMint,
            [], // multiSigners (optional)
            undefined, // confirmOptions (optional)
            TOKEN_2022_PROGRAM_ID // programId
        );
        // Load bearing comment?
        console.log("A GOOD!")
        await mintTo(
            provider.connection,
            user_account,
            tokenB,
            userTokenAccountB,
            user_account.publicKey,
            amountToMint,
            [], // multiSigners (optional)
            undefined, // confirmOptions (optional)
            TOKEN_2022_PROGRAM_ID // programId
        );

    //     Mint token A to the wallet account to swap tokens
        await mintTo(
            provider.connection,
            user_account,
            tokenA,
            walletTokenAccountA,
            user_account.publicKey,
            amountToMint,
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        )

    } catch (error) {
        console.error("Error minting tokens to user account:", error);
        throw error;
    }

    console.log("User Tokens minted successfully");


    // Initialize the pool
    await initializePool(provider, tokenA, tokenB, lpToken, user_account);

    console.log("Pool initialized successfully");

    // deposit into the pool
    await depositIntoPool(provider, tokenA, tokenB,lpToken, user_account);

    console.log("Deposited into pool successfully");

}
main().catch((err) => {
    console.error("Error running script:", err);
    process.exit(1);
});
