import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DigitalNomadExchange } from "../target/types/digital_nomad_exchange";
import {Account, createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo} from "@solana/spl-token";
import {beforeEach} from "mocha";
import * as assert from "node:assert";

describe("digital-nomad-exchange", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;

    let user_account: anchor.web3.Keypair;
    let tokenA: anchor.web3.PublicKey;
    let tokenB: anchor.web3.PublicKey;
    let userTokenAccountA: Account;
    let userTokenAccountB: Account;
    let lpToken: anchor.web3.PublicKey;
    let liquidityPool: anchor.web3.Keypair;
    let amount_to_mint: number;
    let userAssociatedLPToken: Account;
    let lpTokenAccountA: Account;
    let lpTokenAccountB: Account;


    beforeEach(async () => {
        user_account = anchor.web3.Keypair.generate();

        const airdrop_tx = await provider.connection.requestAirdrop(user_account.publicKey, 1000000000);
        // Make sure we wait for confirmation
        await provider.connection.confirmTransaction({
            signature: airdrop_tx,
            ...(await provider.connection.getLatestBlockhash("finalized"))
        });

        //   Create mint accounts to create tokens
        tokenA = await createMint(
            provider.connection,
            user_account,
            user_account.publicKey,
            null,
            9,
        );

        tokenB = await createMint(
            provider.connection,
            user_account,
            user_account.publicKey,
            null,
            9,
        );

        // Create associated token accounts for the user
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

        // Create LP token mint
        lpToken = await createMint(provider.connection, user_account, user_account.publicKey, null, 9);

        // Create liquidity pool account
        liquidityPool = anchor.web3.Keypair.generate();

        console.log(
            `liquidityPool: ${liquidityPool.publicKey.toBase58()}\n`,
            `tokenA: ${userTokenAccountA.address.toBase58()}\n`,
            `tokenB: ${userTokenAccountB.address.toBase58()}\n`,
            `lpToken: ${lpToken.toBase58()}\n`,
            `user: ${user_account.publicKey.toBase58()}\n`,
            `system program: ${anchor.web3.SystemProgram.programId.toBase58()}\n`,
            `rent: ${anchor.web3.SYSVAR_RENT_PUBKEY.toBase58()}\n`
        )

        await program.methods.initialize()
            .accounts({
                liquidityPool: liquidityPool.publicKey,
                tokenA: userTokenAccountA.address,
                tokenB: userTokenAccountB.address,
                lpToken: lpToken,
                user: user_account.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([user_account, liquidityPool])
            .rpc();
        console.log("Contract Deployed", liquidityPool.publicKey.toBase58());

        // Add some tokens to user token accounts
        amount_to_mint = 100_000_000_000;

        // Mint each token to the user account
        await mintTo(
            provider.connection,
            user_account,
            tokenA,
            userTokenAccountA.address,
            user_account.publicKey,
            amount_to_mint,
        )
        await mintTo(
            provider.connection,
            user_account,
            tokenB,
            userTokenAccountB.address,
            user_account.publicKey,
            amount_to_mint,
        )

        // Get the associated token account of the user
        userAssociatedLPToken = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            lpToken,
            user_account.publicKey
        );

        lpTokenAccountA = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenA,
            liquidityPool.publicKey
        )

        lpTokenAccountB = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            user_account,
            tokenB,
            liquidityPool.publicKey
        )
    })

    it("Is initialized!", async () => {

        // Fetch the liquidity pool account
        const liquidityPoolAccount = await program.account.liquidityPool.fetch(liquidityPool.publicKey);

        console.log(`Liquidity Pool Account: ${JSON.stringify(liquidityPoolAccount)}`);

        // Check if the liquidity pool account has the expected values
        assert.ok(liquidityPoolAccount.tokenA.equals(userTokenAccountA.address), "TokenA accounts do not match");
        assert.ok(liquidityPoolAccount.tokenB.equals(userTokenAccountB.address), "TokenB accounts do not match");
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
            .accounts({
                liquidityPool: liquidityPool.publicKey,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA.address,
                lpTokenB: lpTokenAccountB.address,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
            })
            .signers([user_account])
            .rpc();

        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address);
        const lpTokenAAccountInfo = await getAccount(provider.connection, lpTokenAccountA.address);
        const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB.address);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address);

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

    it("can add unequal initial liquidity amounts", async () => {
        // Add some tokens to user token accounts
        const amount_to_send_a = 1_000_000_000;
        const amount_to_send_b = 500_000_000;

        // Call the addLiquidity function on the program with two different amounts
        await program.methods.addLiquidity(new anchor.BN(amount_to_send_a), new anchor.BN(amount_to_send_b))
            .accounts({
                liquidityPool: liquidityPool.publicKey,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA.address,
                lpTokenB: lpTokenAccountB.address,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
            })
            .signers([user_account])
            .rpc();

        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address);
        const lpTokenAAccountInfo = await getAccount(provider.connection, lpTokenAccountA.address);
        const lpTokenBAccountInfo = await getAccount(provider.connection, lpTokenAccountB.address);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address);

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
            .accounts({
                liquidityPool: liquidityPool.publicKey,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA.address,
                lpTokenB: lpTokenAccountB.address,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
            })
            .signers([user_account])
            .rpc();

        // Remove liquidity from the pool
        const current_lp_balance = await getAccount(provider.connection, userAssociatedLPToken.address);

        // remove 50% of the liquidity
        const amount_to_remove = Math.floor(Number(current_lp_balance.amount / BigInt(2)))
        await program.methods.removeLiquidity(new anchor.BN(amount_to_remove))
            .accounts({
                liquidityPool: liquidityPool.publicKey,
                mintA: tokenA,
                userTokenA: userTokenAccountA.address,
                mintB: tokenB,
                userTokenB: userTokenAccountB.address,
                lpTokenA: lpTokenAccountA.address,
                lpTokenB: lpTokenAccountB.address,
                lpToken: lpToken,
                userLpTokenAccount: userAssociatedLPToken.address,
                user: user_account.publicKey,
            })
            .signers([user_account, liquidityPool])
            .rpc();



        // Fetch the token account information
        const tokenAAccountInfo = await getAccount(provider.connection, userTokenAccountA.address);
        const tokenBAccountInfo = await getAccount(provider.connection, userTokenAccountB.address);
        const userAssociatedLPTokenInfo = await getAccount(provider.connection, userAssociatedLPToken.address);

        // Log anc check the balances
        console.log(`Token A Balance: ${tokenAAccountInfo.amount}`);
        assert.equal(tokenAAccountInfo.amount, 99499999999, "Token balance A is incorrect");
        console.log(`Token B Balance: ${tokenBAccountInfo.amount}`);
        assert.equal(tokenBAccountInfo.amount, 99749999999, "Token balance B is incorrect");
        console.log(`User LP Token Balance: ${userAssociatedLPTokenInfo.amount}`);
        assert.equal(userAssociatedLPTokenInfo.amount, 353553391, "LP Token balance is incorrect");

    });
});
