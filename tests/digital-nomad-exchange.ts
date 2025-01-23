import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { DigitalNomadExchange } from "../target/types/digital_nomad_exchange";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as bs58 from "bs58";

describe("digital-nomad-exchange", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  const signer = Keypair.fromSecretKey(
      bs58.decode(
          "588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2"
      )
  );

  let mintA: anchor.web3.PublicKey;
  let mintB: anchor.web3.PublicKey;
  let userTokenAccountA: anchor.web3.PublicKey;
  let userTokenAccountB: anchor.web3.PublicKey;

  before(async () => {
    // Create mint A
    mintA = await createMint(
        connection,
        signer,
        signer.publicKey,
        null,
        9
    );

    // Create mint B
    mintB = await createMint(
        connection,
        signer,
        signer.publicKey,
        null,
        9,
    );
  });



  it("Is initialized with two tokens!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});