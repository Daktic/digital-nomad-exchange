// This file is to be used as a helper module
// We will do things like create Tokens and Pools
// We can then use our frontend to do actions to the pools


import * as anchor from "@coral-xyz/anchor";
import {
    Account, ASSOCIATED_TOKEN_PROGRAM_ID, createInitializeMetadataPointerInstruction, createInitializeMintInstruction,
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
import * as console from "node:console";



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

        console.log(tokenA.toBase58(), tokenB.toBase58());
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



    async function createMetaMint(metaData) {

        // Transaction to send
        let transaction: Transaction;
        // Transaction signature returned from sent transaction
        let transactionSignature: string;

        const mintKeypair = Keypair.generate();
        // Address for Mint Account
        const mint = mintKeypair.publicKey;
        // Decimals for Mint Account
        const decimals = 2;
        // Authority that can mint new tokens
        const mintAuthority = user_account.publicKey;
        // Authority that can update the metadata pointer and token metadata
        const updateAuthority = user_account.publicKey;

        metaData = {
            updateAuthority: updateAuthority,
            mint: mint,
            ...metaData
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

        // Instruction to invoke System Program to create new account
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: user_account.publicKey, // Account that will transfer lamports to created account
            newAccountPubkey: mint, // Address of the account to create
            space: mintLen, // Amount of bytes to allocate to the created account
            lamports, // Amount of lamports transferred to created account
            programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
        });

        // Instruction to initialize the MetadataPointer Extension
        const initializeMetadataPointerInstruction =
            createInitializeMetadataPointerInstruction(
                mint, // Mint Account address
                updateAuthority, // Authority that can set the metadata address
                mint, // Account address that holds the metadata
                TOKEN_2022_PROGRAM_ID,
            );

        // Instruction to initialize Mint Account data
        const initializeMintInstruction = createInitializeMintInstruction(
            mint, // Mint Account Address
            decimals, // Decimals of Mint
            mintAuthority, // Designated Mint Authority
            null, // Optional Freeze Authority
            TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
        );

        // Instruction to initialize Metadata Account data
        const initializeMetadataInstruction = createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
            metadata: mint, // Account address that holds the metadata
            updateAuthority: updateAuthority, // Authority that can update the metadata
            mint: mint, // Mint Account address
            mintAuthority: mintAuthority, // Designated Mint Authority
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        });

        // Instruction to update metadata, adding custom field
        const updateFieldInstruction = createUpdateFieldInstruction({
            programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
            metadata: mint, // Account address that holds the metadata
            updateAuthority: updateAuthority, // Authority that can update the metadata
            field: metaData.additionalMetadata[0][0], // key
            value: metaData.additionalMetadata[0][1], // value
        });

        // Add instructions to new transaction
        transaction = new Transaction().add(
            createAccountInstruction,
            initializeMetadataPointerInstruction,
            // note: the above instructions are required before initializing the mint
            initializeMintInstruction,
            initializeMetadataInstruction,
            updateFieldInstruction,
        );

        // Send transaction
        transactionSignature = await sendAndConfirmTransaction(
            provider.connection,
            transaction,
            [user_account, mintKeypair], // Signers
        );

        console.log(
            `Create MetaMint Account: ${mint} \n -> Transaction Signature: ${transactionSignature}`,
        );

        return mint;
    }

    async function checkTokenMintInitialization(mint: anchor.web3.PublicKey) {
        const mintInfo = await provider.connection.getParsedAccountInfo(mint);
        if (!mintInfo.value) {
            throw new Error(`Token mint ${mint.toBase58()} is not initialized`);
        }
    }

    async function createAssociatedTokenAccounts() {
        console.log("Creating associated token accounts");

        console.log(`Token A Mint: ${tokenA.toBase58()}`);
        console.log(`Token B Mint: ${tokenB.toBase58()}`);
        // Check if token mints are initialized
        await checkTokenMintInitialization(tokenA);
        await checkTokenMintInitialization(tokenB);
        console.log("Both tokens initialized")

        try {
            userTokenAccountA = await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user_account,
                tokenA,
                user_account.publicKey,
                false,
                "confirmed",
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
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
                "confirmed",
                undefined,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            console.log(`User Token Account B: ${userTokenAccountB.address.toBase58()}`);
        } catch (error) {
            console.error("Error creating associated token account for Token B:", error);
            throw error;
        }
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
        const logs = [
            `User Account: ${user_account.publicKey}`,
            `Program ID: ${program.programId}`,
            `Token A: ${tokenA.toBase58()}`,
            `Token B: ${tokenB.toBase58()}`,
            `User Token Account A: ${userTokenAccountA.address.toBase58()}`,
            `User Token Account B: ${userTokenAccountB.address.toBase58()}`,
            `LP Token Account A: ${lpTokenAccountA.toBase58()}`,
            `LP Token Account B: ${lpTokenAccountB.toBase58()}`,
            `LP Token: ${lpToken.toBase58()}`,
            `Liquidity Pool PDA: ${liquidityPoolPda.toBase58()}`,
            `Bump: ${bump}`
        ];
        logs.forEach((log) => {
            try {
                console.log(log);
            } catch (error) {
                console.error("Error logging variable:", error);
                throw error;
            }
        });
    }

    user_account = (provider.wallet as NodeWallet).payer;

    // Create mints via Metaplex
    const tokenAMetadata = {
        name: "Token A",
        symbol: "TA",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        additionalMetadata: [["description", "Only Possible On Solana"]],
    };

    tokenA = await createMetaMint(tokenAMetadata)

    const tokenBMetadata = {
        name: "Token B",
        symbol: "TB",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        additionalMetadata: [["description", "Only Possible On Solana"]],
    };

    tokenB = await createMetaMint(tokenBMetadata)


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
            tokenProgram: TOKEN_2022_PROGRAM_ID,
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