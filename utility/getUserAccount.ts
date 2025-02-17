import * as anchor from "@coral-xyz/anchor";


export async function setUpEnvironment(provider: anchor.Provider) {
    console.log("Setting up environment");
    const user_account = anchor.web3.Keypair.generate();

    const airdrop_tx = await provider.connection.requestAirdrop(user_account.publicKey, 1000000000);
    await provider.connection.confirmTransaction({
        signature: airdrop_tx,
        ...(await provider.connection.getLatestBlockhash("finalized")),
    });

    return {user_account};
}