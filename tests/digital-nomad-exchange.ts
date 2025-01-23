import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DigitalNomadExchange } from "../target/types/digital_nomad_exchange";
import {createMint, getOrCreateAssociatedTokenAccount} from "@solana/spl-token";

describe("digital-nomad-exchange", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;

  it("Is initialized!", async () => {

    const user_account = anchor.web3.Keypair.generate();

    const airdrop_tx = await provider.connection.requestAirdrop(user_account.publicKey, 1000000000);
      // Make sure we wait for confirmation
      await provider.connection.confirmTransaction({
          signature: airdrop_tx,
          ...(await provider.connection.getLatestBlockhash("finalized"))
      });

    //   Create mint accounts to create tokens
    const tokenA = await createMint(
        provider.connection,
        user_account,
        user_account.publicKey,
        null,
        9,
        );

    const tokenB = await createMint(
        provider.connection,
        user_account,
        user_account.publicKey,
        null,
        9,
    );

    // Create associated token accounts for the user
    const userTokenAccountA = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user_account,
        tokenA,
        user_account.publicKey
    );
    const userTokenAccountB = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user_account,
        tokenB,
        user_account.publicKey
    );

    // Create LP token mint
    const lpMint = await createMint(provider.connection, user_account, user_account.publicKey, null, 9);

    // Create liquidity pool account
    const liquidityPool = anchor.web3.Keypair.generate();

    console.log(
        `liquidityPool: ${liquidityPool.publicKey.toBase58()}\n`,
        `tokenA: ${userTokenAccountA.address.toBase58()}\n`,
        `tokenB: ${userTokenAccountB.address.toBase58()}\n`,
        `lpMint: ${lpMint.toBase58()}\n`,
        `user: ${user_account.publicKey.toBase58()}\n`,
        `system program: ${anchor.web3.SystemProgram.programId.toBase58()}\n`,
        `rent: ${anchor.web3.SYSVAR_RENT_PUBKEY.toBase58()}\n`
    )

    // Add your test here.
    const tx = await program.methods.initialize()
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
    console.log("Your transaction signature", tx);
  });
});
