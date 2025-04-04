import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DigitalNomadExchange } from "../target/types/digital_nomad_exchange";
import {
    Account, ASSOCIATED_TOKEN_PROGRAM_ID,
    createInitializeAccountInstruction, createMint,
    getAccount,
    getOrCreateAssociatedTokenAccount,
    mintTo, TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { beforeEach } from "mocha";
import * as assert from "node:assert";
import {setUpEnvironment} from "../utility/getUserAccount";
import {PublicKey, SystemProgram} from "@solana/web3.js";
import {makeTokenMint} from "@solana-developers/helpers"
import * as console from "node:console";

describe("digital-nomad-exchange", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    const feePercentage = 3n; // Represent 0.3% as 3/1000
    const feeDenominator = 1000n;
    anchor.setProvider(provider);
    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;
    let user_account: anchor.web3.Keypair;
    let tokenA: anchor.web3.PublicKey;
    let tokenB: anchor.web3.PublicKey;
    let tokenC: anchor.web3.PublicKey;
    let userTokenAccountA: Account;
    let userTokenAccountB: Account;
    let userTokenAccountC: Account;
    let lpToken: anchor.web3.PublicKey;
    let liquidityPool: anchor.web3.Keypair;
    let amount_to_mint: number;
    let userAssociatedLPToken: Account;
    let lpTokenAccountA: anchor.web3.PublicKey;
    let lpTokenAccountB: anchor.web3.PublicKey;
    let lpTokenAccountC: anchor.web3.PublicKey;
    let liquidityPoolPda: anchor.web3.PublicKey;
    let bump: number;

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

    async function createAssociatedTokenAccounts() {
        console.log("Creating associated token accounts");
        userTokenAccountA = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenA,
            user_account.publicKey,
            true,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        console.log(`User Token Account A: ${userTokenAccountA.address.toBase58()}`);

        userTokenAccountB = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenB,
            user_account.publicKey,
            true,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        console.log(`User Token Account B: ${userTokenAccountB.address.toBase58()}`);

        userTokenAccountC = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenC,
            user_account.publicKey,
            true,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        console.log(`User Token Account C: ${userTokenAccountC.address.toBase58()}`);
    }

    function derivePDAAddresses() {
        console.log("Deriving PDA addresses");

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

    async function mintTokensToUserAccounts(amountToMint:number) {
        console.log("Minting tokens to user accounts");
        await mintTo(
            provider.connection,
            user_account,
            tokenA,
            userTokenAccountA.address,
            user_account.publicKey,
            amountToMint,
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );
        console.log(`Minted ${amountToMint} of TOKEN A to user account`);

        await mintTo(
            provider.connection,
            user_account,
            tokenB,
            userTokenAccountB.address,
            user_account.publicKey,
            amountToMint,
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );
        console.log(`Minted ${amountToMint} of TOKEN B to user account`);

        await mintTo(
            provider.connection,
            user_account,
            tokenC,
            userTokenAccountC.address,
            user_account.publicKey,
            amountToMint,
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );
        console.log(`Minted ${amountToMint} of TOKEN C to user account`);
    }

    // currently not working?
    async function setUpFakeTokenCAccountForLP() {
        console.log("Setting up fake token C account for LP");

        // Derive the PDA for the token C account
        const [lpTokenCPda, lpTokenCBump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_token_c"), tokenC.toBuffer()],
            program.programId
        );

        // Get the minimum balance for rent exemption
        const ACCOUNT_SIZE = 165;
        const lamportsForRent = await provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);

        // Create the PDA account with the correct seed
        const createAccountIx = anchor.web3.SystemProgram.createAccountWithSeed({
            fromPubkey: user_account.publicKey,
            newAccountPubkey: lpTokenCPda,
            basePubkey: user_account.publicKey,
            seed: "pool_token_c",
            space: ACCOUNT_SIZE,
            lamports: lamportsForRent,
            programId: program.programId,
        });

        // Initialize the PDA account
        const initAccountIx = createInitializeAccountInstruction(
            lpTokenCPda,
            tokenC,
            liquidityPoolPda,
            TOKEN_2022_PROGRAM_ID
        );

        // Create and send the transaction
        const tx = new anchor.web3.Transaction().add(createAccountIx).add(initAccountIx);
        await provider.sendAndConfirm(tx, [user_account]);

        // Assign the PDA to lpTokenAccountC
        lpTokenAccountC = lpTokenCPda;
    }

    function logVariables() {
        console.log(`Token A: ${tokenA.toBase58()}`);
        console.log(`Token B: ${tokenB.toBase58()}`);
        console.log(`Token C: ${tokenC.toBase58()}`);
        console.log(`User Token Account A: ${userTokenAccountA.address.toBase58()}`);
        console.log(`User Token Account B: ${userTokenAccountB.address.toBase58()}`);
        console.log(`User Token Account C: ${userTokenAccountC.address.toBase58()}`);
        console.log(`User Associated LP Token Account: ${userAssociatedLPToken.address.toBase58()}`);
        console.log(`LP Token Account A: ${lpTokenAccountA.toBase58()}`);
        console.log(`LP Token Account B: ${lpTokenAccountB.toBase58()}`);
        // console.log(`LP Token Account C: ${lpTokenAccountC.toBase58()}`);
        console.log(`LP Token: ${lpToken.toBase58()}`);
        console.log(`Liquidity Pool: ${liquidityPool.publicKey.toBase58()}`);
        console.log(`Liquidity Pool PDA: ${liquidityPoolPda.toBase58()}`);
        console.log(`Bump: ${bump}`);
    }

    beforeEach(async () => {
        // Set up user account and provider
        const setup = await setUpEnvironment(provider);
        user_account = setup.user_account;
        console.log("Creating new Mints");
        // Create mints
        const tokenAMetadata = {
            name: "USD Coin",
            symbol: "USDC",
            uri: "https://etherscan.io/token/images/usdc_ofc_32.svg",
        };
        tokenA = await createFungibleTokenWithMetadata(provider, tokenAMetadata, user_account);

        const tokenBMetadata = {
            name: "Tether",
            symbol: "USDT",
            uri: "https://imgs.search.brave.com/3CpFLBfBLgar1MCKskrOhFvyEAweuZ6S41ikpGbNGdc/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9zMy5j/b2ludGVsZWdyYXBo/LmNvbS9zdG9yYWdl/L3VwbG9hZHMvdmll/dy80NWFjODg2ZWNl/MTY0ZmZiYTcxMWU5/YzczYjU5ZDdiOC5w/bmc",
        };
        tokenB = await createFungibleTokenWithMetadata(provider, tokenBMetadata, user_account);

        // Create fake token for testing:
        const tokenCMetadata = {
            name: "Fake Token",
            symbol: "FAKE",
            uri: "https://example.com/fake-metadata.json"
        };
        tokenC = new PublicKey(await createFungibleTokenWithMetadata(provider, tokenCMetadata, user_account));

        // --- Sort mints so that tokenA is the lower (canonical) mint ---
        const sortedMints = sortTokens(tokenA, tokenB);
        tokenA = sortedMints.sortedTokenA;
        tokenB = sortedMints.sortedTokenB;

        console.log("Tokens minted and sorted")

        // Create associated token accounts for the user using the sorted mints
        await createAssociatedTokenAccounts();

        // Create liquidity pool account keypair
        liquidityPool = anchor.web3.Keypair.generate();

        const [_liquidityPoolPda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("liquidity_pool"), tokenA.toBuffer(), tokenB.toBuffer()],
            program.programId
        );
        liquidityPoolPda = _liquidityPoolPda;
        bump = _bump;

        // Create LP token mint.
        lpToken = await createMint(
            provider.connection,
            user_account,
            liquidityPoolPda,
            liquidityPoolPda,
            9,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID
        )

        // Derive the liquidity pool PDA using the sorted mints
        derivePDAAddresses();

        // Intialize the PDA account in first
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
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([user_account])
            .rpc();

        // Mint tokens to the user token accounts
        amount_to_mint = 100_000_000_000;
        await mintTokensToUserAccounts(amount_to_mint);

        // Get the associated LP token account for the user
        userAssociatedLPToken = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            lpToken,
            user_account.publicKey,
            true,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Create a fake token C account for testing
        // Currently not working
        // await setUpFakeTokenCAccountForLP();

        // Log the variables
        logVariables();
        console.log("Setup complete");
    });

    it("Is initialized!", async () => {
        // Fetch the liquidity pool account
        const liquidityPoolAccount = await program.account.liquidityPool.fetch(liquidityPoolPda);

        console.log(`Liquidity Pool Account: ${JSON.stringify(liquidityPoolAccount)}`);

        // Check if the liquidity pool account has the expected values
        assert.ok(liquidityPoolAccount.tokenA.equals(tokenA), "TokenA accounts do not match");
        assert.ok(liquidityPoolAccount.tokenB.equals(tokenB), "TokenB accounts do not match");
        assert.ok(liquidityPoolAccount.lpToken.equals(lpToken), "LP mint accounts do not match");
        assert.ok(liquidityPoolAccount.owner.equals(user_account.publicKey), "Owner accounts do not match");

        console.log("Liquidity pool is initialized with the correct values");
    });


it("Can Add Liquidity", async () => {
        // Call the addLiquidity function on the program
        // The user will supply a 1:1 ratio of both tokens, each with 9 decimals
        // The anchor.BN is used to create a new Big Number instance
        const amount_to_send = amount_to_mint;
        await program.methods.addLiquidity(new anchor.BN(amount_to_send), new anchor.BN(amount_to_send))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user_account])
            .rpc();

        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenAAccountInfo = await getAccount(provider.connection, lpTokenAccountA, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB, undefined, TOKEN_2022_PROGRAM_ID);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address, undefined, TOKEN_2022_PROGRAM_ID);

        // Calculate the expected lp balance
        // Since first deposit, should be equal to the sqrt of the two token amounts multiplied together.
        // Since we are adding 1:1, the sqrt is equal to the amount of either token., i.e. amount to send
        const expected_lp_balance = Math.sqrt(amount_to_mint * amount_to_mint);
        // Log anc check the balances
        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);
        assert.equal(tokenAAccountInfo.amount, 0, "Token A balance should be 0 after adding liquidity");
        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);
        assert.equal(tokenBAccountInfo.amount, 0, "Token B balance should be 0 after adding liquidity");
        console.log(`LP Token A Balance: ${lpTokenAAccountInfo.amount}`);
        assert.equal(lpTokenAAccountInfo.amount, amount_to_send, "LP Token A balance is incorrect");
        console.log(`LP Token A Balance: ${lpTokenBAccountInfo.amount}`);
        assert.equal(lpTokenBAccountInfo.amount, amount_to_send, "LP Token B balance is incorrect");
        console.log(`User LP Token Balance: ${userAssociatedLPTokenInfo.amount}`);
        assert.equal(userAssociatedLPTokenInfo.amount, expected_lp_balance, "LP Token balance is incorrect");

    });

    it("Can Add Liquidity Twice", async () => {
        // Call the addLiquidity function on the program
        // The user will supply a 1:1 ratio of both tokens, each with 9 decimals
        // The anchor.BN is used to create a new Big Number instance
        const amount_to_send = amount_to_mint / 2;
        await program.methods.addLiquidity(new anchor.BN(amount_to_send), new anchor.BN(amount_to_send))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();

        // grab pre amounts for calulation
        const lpTokenAAccountInfoBefore = await getAccount(provider.connection, lpTokenAccountA, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenBAccountInfoBefore = await getAccount(provider.connection, lpTokenAccountB, undefined, TOKEN_2022_PROGRAM_ID);

        // Do it again
        await program.methods.addLiquidity(new anchor.BN(amount_to_send), new anchor.BN(amount_to_send))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();


        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenAAccountInfo = await getAccount(provider.connection, lpTokenAccountA, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB, undefined, TOKEN_2022_PROGRAM_ID);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address, undefined, TOKEN_2022_PROGRAM_ID);

        // Log anc check the balances
        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);
        assert.equal(tokenAAccountInfo.amount, 0, "Token A balance should be 0 after adding liquidity");
        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);
        assert.equal(tokenBAccountInfo.amount, 0, "Token B balance should be 0 after adding liquidity");
        console.log(`LP Token A Balance: ${lpTokenAAccountInfo.amount}`);
        assert.equal(lpTokenAAccountInfo.amount, amount_to_send * 2, "LP Token A balance is incorrect");
        console.log(`LP Token A Balance: ${lpTokenBAccountInfo.amount}`);
        assert.equal(lpTokenBAccountInfo.amount, amount_to_send * 2, "LP Token B balance is incorrect");
        console.log(`User LP Token Balance: ${userAssociatedLPTokenInfo.amount}`);

        const lpTotalSupplyB4 = Math.sqrt(amount_to_send * amount_to_send);
        // because we are adding the same amount each time A added / A existing will = 1. same for B
        const minDiff = Math.min(Number(BigInt(amount_to_send)/BigInt(lpTokenAAccountInfoBefore.amount)),Number(BigInt(amount_to_send)/BigInt(lpTokenBAccountInfoBefore.amount)))
        const expected_lp_minted = lpTotalSupplyB4 * minDiff;

        console.log(`LP Minted on Second insertion: ${expected_lp_minted}`);

        const expected_lp_amount = lpTotalSupplyB4 + expected_lp_minted;

        console.log(`Expected LP Amount: ${lpTokenAAccountInfo.amount}`);

        assert.equal(userAssociatedLPTokenInfo.amount, expected_lp_amount, "LP Token balance is incorrect");

    });

    it("can't add arbitrary tokens into liquidity pool", async () => {


        const amount_to_send_a = 1_000_000_000;
        const amount_to_send_b = 500_000_000;
        const amount_to_send_c = 87_654_321
        await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();

        // Add arbitrary token
        let threwError = false;
        try {
            await program.methods.addLiquidity(new anchor.BN(amount_to_send_c), new anchor.BN(amount_to_send_c))
                .accountsStrict({
                    liquidityPool: liquidityPoolPda,
                    mintA: tokenC,
                    userTokenA: userTokenAccountC.address,
                    mintB: tokenB,
                    userTokenB: userTokenAccountB.address,
                    lpTokenA: lpTokenAccountC,
                    lpTokenB: lpTokenAccountB,
                    lpToken: lpToken,
                    userLpTokenAccount: userAssociatedLPToken.address,
                    user: user_account.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId
                })
                .signers([user_account])
                .rpc();
        } catch(err) {
            // should throw error
            threwError = true;
        }
        assert.equal(threwError, true, "Should throw error when adding arbitrary token to liquidity pool");

        // Fetch the token account information
        const userTokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const userTokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
        const userTokenCAccountInfo = await getAccount(provider.connection, userTokenAccountC.address, undefined, TOKEN_2022_PROGRAM_ID);

        // Log anc check the balances
        console.log(`User Token A Balance: ${userTokenAAccountInfo.amount}`);
        assert.equal(userTokenAAccountInfo.amount, amount_to_mint-amount_to_send_a, "Token A balance should be same after attempting adding fraudulent liquidity");
        console.log(`User Token B Balance: ${userTokenBAccountInfo.amount}`);
        assert.equal(userTokenBAccountInfo.amount, amount_to_mint-amount_to_send_b, "Token A balance should be same after attempting adding fraudulent liquidity");
        console.log(`User Token C Balance: ${userTokenCAccountInfo.amount}`);
        assert.equal(userTokenCAccountInfo.amount, amount_to_mint, "Token A balance should be same after attempting adding fraudulent liquidity");



    })

    it("can add unequal initial liquidity amounts", async () => {
        // Add some tokens to user token accounts
        const amount_to_send_a = 1_000_000_000;
        const amount_to_send_b = 500_000_000;

        // Call the addLiquidity function on the program with two different amounts
        await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();

        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenAAccountInfo = await getAccount(provider.connection, lpTokenAccountA, undefined, TOKEN_2022_PROGRAM_ID);
        const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB, undefined, TOKEN_2022_PROGRAM_ID);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address, undefined, TOKEN_2022_PROGRAM_ID);

        // Calculate the expected lp balance
        // The LP token amount should be the geometric mean of the two token amounts
        const expected_lp_balance = Math.floor(Math.sqrt(amount_to_send_a * amount_to_send_b));
        // Log anc check the balances
        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);
        assert.equal(tokenAAccountInfo.amount, amount_to_mint - amount_to_send_a, "Token A balance should be 0 after adding liquidity");
        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);
        assert.equal(tokenBAccountInfo.amount, amount_to_mint - amount_to_send_b, "Token B balance should be 0 after adding liquidity");
        console.log(`LP Token A Balance: ${lpTokenAAccountInfo.amount}`);
        assert.equal(lpTokenAAccountInfo.amount, amount_to_send_a, "LP Token A balance is incorrect");
        console.log(`LP Token A Balance: ${lpTokenBAccountInfo.amount}`);
        assert.equal(lpTokenBAccountInfo.amount, amount_to_send_b, "LP Token B balance is incorrect");
        console.log(`User LP Token Balance: ${userAssociatedLPTokenInfo.amount}`);
        console.log(`Expected LP Token Balance: ${expected_lp_balance}`);
        assert.equal(userAssociatedLPTokenInfo.amount, expected_lp_balance, "LP Token balance is incorrect");
    });

    it("can remove liquidity", async () => {
        const amount_to_send_a = 1_000_000_000;
        const amount_to_send_b = 500_000_000;

        // Add some tokens to the liquidity pool
        await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();

        // Remove liquidity from the pool
        const current_lp_balance = await getAccount(provider.connection, userAssociatedLPToken.address, undefined, TOKEN_2022_PROGRAM_ID);

        // remove 50% of the liquidity
        const amount_to_remove = Math.floor(Number(current_lp_balance.amount / BigInt(2)))
        await program.methods.removeLiquidity(new anchor.BN(amount_to_remove))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();



        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address, undefined, TOKEN_2022_PROGRAM_ID);

        // Log anc check the balances
        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);
        assert.equal(tokenAAccountInfo.amount, 99499999999, "Token balance A is incorrect");
        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);
        assert.equal(tokenBAccountInfo.amount, 99749999999, "Token balance B is incorrect");
        console.log(`User LP Token Balance: ${userAssociatedLPTokenInfo.amount}`);
        assert.equal(userAssociatedLPTokenInfo.amount, 353553391, "LP Token balance is incorrect");

    });

    it('Can swap tokens', async () => {
        const amount_to_send_a = 1_000_000_000;
        const amount_to_send_b = 500_000_000;

        console.log(
            "User Token A Account Pre liquidity",
            (await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID)).amount
        )

        // Add some tokens to the liquidity pool
        await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([user_account])
            .rpc();

        console.log(
            "User Token A Account Pre Swap / Post Liquidity",
            (await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID)).amount
        )

        const lpTokenAAccountInfo = await getAccount(provider.connection, lpTokenAccountA, undefined, TOKEN_2022_PROGRAM_ID);
        console.log("LP Token A Amount pre swap", lpTokenAAccountInfo.amount);
        const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB, undefined, TOKEN_2022_PROGRAM_ID);
        console.log("LP Token B Amount pre swap", lpTokenBAccountInfo.amount);
        // Swap tokens
        const amount_to_swap = 100_000;
        try {
            await program.methods
                .swapTokens(new anchor.BN(amount_to_swap), false)
                .accountsStrict({
                    liquidityPool: liquidityPoolPda,
                    mintA: tokenA,
                    userTokenA: userTokenAccountA.address,
                    mintB: tokenB,
                    userTokenB: userTokenAccountB.address,
                    lpTokenA: lpTokenAccountA,
                    lpTokenB: lpTokenAccountB,
                    lpToken: lpToken,
                    user: user_account.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([user_account])
                .rpc();
        } catch (err) {
            if (err.logs) {
                console.error("Transaction logs:", err.logs);
            }
        }

        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);

        console.log(`User Token A Account Post Swap / Post Liquidity:`, tokenAAccountInfo.amount);
        const expectedTokenABalance = BigInt(amount_to_mint) - BigInt(amount_to_send_a) - BigInt(amount_to_swap);

        console.log(`Expected Token A Balance: ${expectedTokenABalance}`);
        assert.equal(tokenAAccountInfo.amount, expectedTokenABalance, "Token balance A is incorrect");

        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);

        // Deduct Fee
        const amountToSwapAfterFee = BigInt(amount_to_swap) * (feeDenominator - feePercentage) / feeDenominator;
        const newBalanceA = BigInt(amount_to_send_a) + BigInt(amountToSwapAfterFee);
        const newBalanceB = (BigInt(amount_to_send_a) * BigInt(amount_to_send_b)) / newBalanceA;
        const intermediateSwapAmount = BigInt(amount_to_send_b) - newBalanceB; // Intermediate calculation
        console.log(`Intermediate Swap Amount: ${intermediateSwapAmount}`);
        const truncatedSwapAmount = intermediateSwapAmount / BigInt(1); // Mimic backend truncation
        console.log(`Expected Swap Amount: ${truncatedSwapAmount}`);

        const expectedTokenBalance = BigInt(amount_to_mint) - BigInt(amount_to_send_b) + truncatedSwapAmount;
        console.log(`Expected Token Balance: ${expectedTokenBalance}`);

        const tolerance = BigInt(1); // 1 token tolerance

        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);

        // Check if the difference is within the tolerance,
        // Having trouble with the exact value due to truncation
        const isWithinTolerance = (
            tokenBAccountInfo.amount <= expectedTokenBalance + tolerance &&
            tokenBAccountInfo.amount >= expectedTokenBalance - tolerance
        );
        assert.equal(isWithinTolerance,true, `Token balance B is incorrect. Exceeds tolerance`);

    });

    it('Can swap tokens in reverse', async () => {
        const amount_to_send_a = 1_000_000_000;
        const amount_to_send_b = 500_000_000;

        // Add some tokens to the liquidity pool
        await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
            .accountsStrict({
                liquidityPool: liquidityPoolPda,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA,
                lpTokenB: lpTokenAccountB,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .signers([user_account])
            .rpc();

        const amount_to_swap = 100_000;
        try {
            // Swap in reverse order

            await program.methods.swapTokens(new anchor.BN(amount_to_swap),true)
                .accountsStrict({
                    liquidityPool: liquidityPoolPda,
                    // This will be flipped so that token B is swapped for token A
                    mintA: tokenA,
                    userTokenA: userTokenAccountA.address,
                    mintB: tokenB,
                    userTokenB: userTokenAccountB.address,
                    lpTokenA: lpTokenAccountA,
                    lpTokenB: lpTokenAccountB,
                    lpToken: lpToken,
                    user: user_account.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId
                })
                .signers([user_account])
                .rpc();
        } catch (err) {
            if (err.logs) {
                console.error("Transaction logs:", err.logs);
            }
        }


        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address, undefined, TOKEN_2022_PROGRAM_ID);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);

        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);
        assert.equal(tokenBAccountInfo.amount,
            amount_to_mint - amount_to_send_b - amount_to_swap, "Token balance B is incorrect");

        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);

        // Deduct Fee
        const amountToSwapAfterFee = BigInt(amount_to_swap) * (feeDenominator - feePercentage) / feeDenominator;
        const newBalanceB = BigInt(amount_to_send_b) + BigInt(amountToSwapAfterFee);
        const newBalanceA = (BigInt(amount_to_send_b) * BigInt(amount_to_send_a)) / newBalanceB;
        const intermediateSwapAmount = BigInt(amount_to_send_a) - newBalanceA;

        console.log(`Intermediate Swap Amount: ${intermediateSwapAmount}`);
        const truncatedSwapAmount = intermediateSwapAmount / BigInt(1); // Mimic backend truncation
        console.log(`Expected Swap Amount: ${truncatedSwapAmount}`);
        const expectedTokenBalance = BigInt(amount_to_mint) - BigInt(amount_to_send_a) + truncatedSwapAmount;
        console.log(`Expected Token Balance: ${expectedTokenBalance}`);

        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);
        const tolerance = BigInt(1); // 1 token tolerance
        // Check if the difference is within the tolerance,
        // Having trouble with the exact value due to truncation
        const isWithinTolerance = (
            tokenAAccountInfo.amount <= expectedTokenBalance + tolerance &&
            tokenAAccountInfo.amount >= expectedTokenBalance - tolerance
        );
        assert.equal(isWithinTolerance,true, `Token balance A is incorrect. Exceeds tolerance`);

    });

    // TODO
    // it("Can't swap arbitrary tokens", async () => {
    //
    //     const amount_to_send_a = 1_000_000_000;
    //     const amount_to_send_b = 500_000_000;
    //
    //     let userTokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
    //     console.log(`User Token B Balance 1: ${userTokenBAccountInfo.amount}`);
    //
    //     // Add some tokens to the liquidity pool
    //     await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
    //         .accountsStrict({
    //             liquidityPool: liquidityPoolPda,
    //             mintA: tokenA,
    //             userTokenA: userTokenAccountA.address,
    //             mintB: tokenB,
    //             userTokenB: userTokenAccountB.address,
    //             lpTokenA: lpTokenAccountA,
    //             lpTokenB: lpTokenAccountB,
    //             lpToken: lpToken,
    //             userLpTokenAccount: userAssociatedLPToken.address,
    //             user: user_account.publicKey,
    //             tokenProgram: TOKEN_2022_PROGRAM_ID,
    //             systemProgram: SystemProgram.programId
    //         })
    //         .signers([user_account])
    //         .rpc();
    //
    //     userTokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
    //     console.log(`User Token B Balance 2: ${userTokenBAccountInfo.amount}`);
    //
    //     // Create LP Token account for token C
    //     const lpTokenAccountC = await getOrCreateAssociatedTokenAccount(
    //         provider.connection,
    //         user_account,
    //         tokenC,
    //         liquidityPool.publicKey
    //     );
    //
    //     // Swap Arbitrary tokens
    //     let threwError = false;
    //     try {
    //         const amount_to_swap = 534_321;
    //         await program.methods.swapTokens(new anchor.BN(amount_to_swap))
    //             .accountsStrict({
    //                 liquidityPool: liquidityPoolPda,
    //                 // This will be standard so that token A is swapped for token b
    //                 mintA: tokenC,
    //                 userTokenA: userTokenAccountC.address,
    //                 mintB: tokenB,
    //                 userTokenB: userTokenAccountB.address,
    //                 lpTokenA: lpTokenAccountC.address,
    //                 lpTokenB: lpTokenAccountB,
    //                 lpToken: lpToken,
    //                 user: user_account.publicKey,
    //                 tokenProgram: TOKEN_2022_PROGRAM_ID,
    //                 systemProgram: SystemProgram.programId
    //             })
    //             .signers([user_account])
    //             .rpc();
    //     } catch (err) {
    //         // should throw error
    //         threwError = true;
    //         }
    //     assert.equal(threwError, true, "Should throw error when swapping arbitrary token");
    //     // Fetch the token account information
    //     userTokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address, undefined, TOKEN_2022_PROGRAM_ID);
    //     const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB, undefined, TOKEN_2022_PROGRAM_ID);
    //
    //     console.log(`User Token B Balance 3: ${userTokenBAccountInfo.amount}`);
    //     assert.equal(userTokenBAccountInfo.amount, amount_to_mint-amount_to_send_b, "User Token balance B is should stay the same");
    //     console.log(`LP Token B Balance: ${lpTokenBAccountInfo.amount}`);
    //     assert.equal(lpTokenBAccountInfo.amount, amount_to_send_b, "Pool Token balance B is should stay the same");
    // });

});
