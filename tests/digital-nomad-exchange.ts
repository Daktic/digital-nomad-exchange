import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DigitalNomadExchange } from "../target/types/digital_nomad_exchange";
import {Account, createMint, getOrCreateAssociatedTokenAccount} from "@solana/spl-token";
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
    let lpMint: anchor.web3.PublicKey;
    let liquidityPool: anchor.web3.Keypair;

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
        lpMint = await createMint(provider.connection, user_account, user_account.publicKey, null, 9);

        // Create liquidity pool account
        liquidityPool = anchor.web3.Keypair.generate();

        console.log(
            `liquidityPool: ${liquidityPool.publicKey.toBase58()}\n`,
            `tokenA: ${userTokenAccountA.address.toBase58()}\n`,
            `tokenB: ${userTokenAccountB.address.toBase58()}\n`,
            `lpMint: ${lpMint.toBase58()}\n`,
            `user: ${user_account.publicKey.toBase58()}\n`,
            `system program: ${anchor.web3.SystemProgram.programId.toBase58()}\n`,
            `rent: ${anchor.web3.SYSVAR_RENT_PUBKEY.toBase58()}\n`
        )

        await program.methods.initialize()
            .accounts({
                liquidityPool: liquidityPool.publicKey,
                tokenA: userTokenAccountA.address,
                tokenB: userTokenAccountB.address,
                lpMint: lpMint,
                user: user_account.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([user_account, liquidityPool])
            .rpc();
        console.log("Contract Deployed", liquidityPool.publicKey.toBase58());
    })

  it("Is initialized!", async () => {

      // Fetch the liquidity pool account
      const liquidityPoolAccount = await program.account.liquidityPool.fetch(liquidityPool.publicKey);

      console.log(`Liquidity Pool Account: ${JSON.stringify(liquidityPoolAccount)}`);

      // Check if the liquidity pool account has the expected values
      assert.ok(liquidityPoolAccount.tokenA.equals(userTokenAccountA.address), "TokenA accounts do not match");
      assert.ok(liquidityPoolAccount.tokenB.equals(userTokenAccountB.address), "TokenB accounts do not match");
      assert.ok(liquidityPoolAccount.lpMint.equals(lpMint), "LP mint accounts do not match");
      assert.ok(liquidityPoolAccount.owner.equals(user_account.publicKey), "Owner accounts do not match");

      console.log("Liquidity pool is initialized with the correct values");

  });
});
