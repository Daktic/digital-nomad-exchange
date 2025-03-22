import * as anchor from "@coral-xyz/anchor";
import {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
    mplTokenMetadata,
    createV1,
    TokenStandard
} from "@metaplex-foundation/mpl-token-metadata";
import { DigitalNomadExchange } from "../target/types/digital_nomad_exchange";
import { Program } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
    PublicKey,
    SystemProgram,
} from "@solana/web3.js";
import * as console from "node:console";
import {createSignerFromKeypair, generateSigner, percentAmount, signerIdentity} from "@metaplex-foundation/umi";


const main = async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DigitalNomadExchange as Program<DigitalNomadExchange>;
    let user_account: anchor.web3.Keypair;
    let tokenA!: anchor.web3.PublicKey;
    let tokenB!: anchor.web3.PublicKey;
    let userTokenAccountA: any;
    let userTokenAccountB: any;
    let lpToken!: anchor.web3.PublicKey; // Now the LP token will be a mint.
    let liquidityPoolPda!: anchor.web3.PublicKey;
    let bump: number;
    let lpTokenAccountA!: anchor.web3.PublicKey;
    let lpTokenAccountB!: anchor.web3.PublicKey;

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

    // Create a fungible token mint with MPL metadata.
    async function createFungibleTokenWithMetadata(metadata: any) {
        const umi = createUmi('https://api.devnet.solana.com');
        let keypair = umi.eddsa.createKeypairFromSecretKey(user_account.secretKey);
        const signer = createSignerFromKeypair(umi, keypair);
        const mint = generateSigner(umi);
        umi.use(signerIdentity(signer));
        umi.use(mplTokenMetadata());

        await createV1(umi, {
            mint,
            authority: signer,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            sellerFeeBasisPoints: percentAmount(0),
            tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(umi);

        console.log(`Minted token with public key: ${mint.publicKey}`);
        return new PublicKey(mint.publicKey);
    }

    async function checkTokenMintInitialization(mint: PublicKey) {
        const mintInfo = await provider.connection.getParsedAccountInfo(mint);
        if (!mintInfo.value) {
            throw new Error(`Token mint ${mint.toBase58()} is not initialized`);
        }
    }

    async function createAssociatedTokenAccounts() {
        console.log("Creating associated token accounts");
        console.log(`Token A Mint: ${tokenA.toBase58()}`);
        console.log(`Token B Mint: ${tokenB.toBase58()}`);
        await checkTokenMintInitialization(tokenA);
        await checkTokenMintInitialization(tokenB);
        console.log("Both tokens initialized");

        try {
            userTokenAccountA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user_account,
                tokenA,
                user_account.publicKey,
                false,
                "finalized"
            );
            console.log(`User Token Account A: ${userTokenAccountA.address.toBase58()}`);
        } catch (error) {
            console.error("Error creating associated token account for Token A:", error);
            throw error;
        }

        try {
            userTokenAccountB = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user_account,
                tokenB,
                user_account.publicKey,
                false,
                "finalized"
            );
            console.log(`User Token Account B: ${userTokenAccountB.address.toBase58()}`);
        } catch (error) {
            console.error("Error creating associated token account for Token B:", error);
            throw error;
        }
    }

    function derivePDAAddresses() {
        console.log("Deriving PDA addresses");
        const [_liquidityPoolPda, _bump] = PublicKey.findProgramAddressSync(
            [Buffer.from("liquidity_pool"), tokenA.toBuffer(), tokenB.toBuffer()],
            program.programId
        );
        liquidityPoolPda = _liquidityPoolPda;
        bump = _bump;

        const [lpTokenAPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool_token_a"), tokenA.toBuffer()],
            program.programId
        );
        const [lpTokenBPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool_token_b"), tokenB.toBuffer()],
            program.programId
        );
        lpTokenAccountA = lpTokenAPda;
        lpTokenAccountB = lpTokenBPda;
    }

    function logVariables() {
        const logs = [
            `User Account: ${user_account.publicKey.toBase58()}`,
            `Program ID: ${program.programId.toBase58()}`,
            `Token A: ${tokenA.toBase58()}`,
            `Token B: ${tokenB.toBase58()}`,
            `User Token Account A: ${userTokenAccountA.address.toBase58()}`,
            `User Token Account B: ${userTokenAccountB.address.toBase58()}`,
            `LP Token Account A: ${lpTokenAccountA.toBase58()}`,
            `LP Token Account B: ${lpTokenAccountB.toBase58()}`,
            `LP Token (Mint): ${lpToken.toBase58()}`,
            `Liquidity Pool PDA: ${liquidityPoolPda.toBase58()}`,
            `Bump: ${bump}`,
        ];
        logs.forEach((log) => console.log(log));
    }

    // Get the user account from the provider wallet.
    user_account = (provider.wallet as NodeWallet).payer;

    // Create mints for Token A and Token B via MPL metadata.
    const tokenAMetadata = {
        name: "Token A",
        symbol: "TA",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    };
    tokenA = await createFungibleTokenWithMetadata(tokenAMetadata);

    const tokenBMetadata = {
        name: "Token B",
        symbol: "TB",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    };
    tokenB = await createFungibleTokenWithMetadata(tokenBMetadata);

    // --- Sort mints so that tokenA is the canonical (lower) mint ---
    const sortedMints = sortTokens(tokenA, tokenB);
    tokenA = sortedMints.sortedTokenA;
    tokenB = sortedMints.sortedTokenB;

    // Create associated token accounts for the user using the sorted mints.
    await createAssociatedTokenAccounts();

    // Create LP token mint using the same helper (instead of an associated token account).
    const lpTokenMetadata = {
        name: "LP Token",
        symbol: "LPT",
        uri: "https://example.com/lp-metadata.json" // Replace with your LP metadata URI
    };
    lpToken = await createFungibleTokenWithMetadata(lpTokenMetadata);

    // Derive the liquidity pool PDA using the sorted mints.
    derivePDAAddresses();

    logVariables();

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
            lpTokenA: lpTokenAccountA,
            lpTokenB: lpTokenAccountB,
            user: user_account.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user_account])
        .rpc();
};

main().catch((err) => {
    console.error("Error running script:", err);
    process.exit(1);
});
