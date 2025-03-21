// This file is to be used as a helper module
// We will do things like create Tokens and Pools
// We can then use our frontend to do actions to the pools


import * as anchor from "@coral-xyz/anchor";
import {
    Account, createInitializeMetadataPointerInstruction, createInitializeMintInstruction,
    createMint, ExtensionType, getMintLen,
    getOrCreateAssociatedTokenAccount,
    LENGTH_SIZE, TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TYPE_SIZE
} from "@solana/spl-token";
import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    createRemoveKeyInstruction,
    pack,
    TokenMetadata,
} from "@solana/spl-token-metadata";
import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
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

    async function createMetaData(
        mint: anchor.web3.PublicKey,
        tokenName: string,
        tokenSymbol: string,
        tokenURI: string
    ) {
     const metaData :TokenMetadata = {
         updateAuthority:user_account.publicKey,
            mint,
         name:tokenName,
         symbol:tokenSymbol,
         uri:tokenURI,
         additionalMetadata:[]
     }

        const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
        // Size of metadata
        const metadataLen = pack(metaData).length;
        // Size of Mint Account with extension
        const mintLen = getMintLen([ExtensionType.MetadataPointer]);

        // Minimum lamports required for Mint Account
        const lamports = await provider.connection.getMinimumBalanceForRentExemption(
            mintLen + metadataExtension + metadataLen,
        );

        let transaction: Transaction;

        // account to hold the meta-data
        const metadataAccount = Keypair.generate();

        const accountInfo = await provider.connection.getAccountInfo(metadataAccount.publicKey);
        if (accountInfo !== null) {
            console.log(`Metadata account ${metadataAccount.publicKey.toBase58()} already exists.`);
            return;
        }

        // Instruction to invoke System Program to create new account
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: user_account.publicKey, // Account that will transfer lamports to created account
            newAccountPubkey: metadataAccount.publicKey, // Address of the account to create
            space: mintLen, // Amount of bytes to allocate to the created account
            lamports, // Amount of lamports transferred to created account
            programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
        });

        // Instruction to initialize the MetadataPointer Extension
        const initializeMetadataPointerInstruction =
            createInitializeMetadataPointerInstruction(
                mint, // Mint Account address
                user_account.publicKey, // Authority that can set the metadata address
                metadataAccount.publicKey, // Account address that holds the metadata
                TOKEN_2022_PROGRAM_ID,
            );

        // Instruction to initialize Metadata Account data
        const initializeMetadataInstruction = createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
            metadata: metadataAccount.publicKey, // Account address that holds the metadata
            updateAuthority: user_account.publicKey, // Authority that can update the metadata
            mint: mint, // Mint Account address
            mintAuthority: user_account.publicKey, // Designated Mint Authority
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        });

        // Add instructions to new transaction
        transaction = new Transaction().add(
            createAccountInstruction,
            initializeMetadataPointerInstruction,
            initializeMetadataInstruction,
        );

// Send transaction
        const transactionSignature = await sendAndConfirmTransaction(
            provider.connection,
            transaction,
            [user_account, metadataAccount], // Signers
        );

        console.log(
            "\nCreate Mint Account:",
            `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
        );
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

    await createMetaData(
        tokenA,
        "USD Coin",
        "USDC",
        "",
    );
    await createMetaData(
        tokenB,
        "USD Tether",
        "USDT",
        "https://arweave.net/E5mBuyuHTqf25G1A1lrSQOBg3pj_4Qe5-ZWxPbOPzAA",
    );

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