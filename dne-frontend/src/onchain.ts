import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://api.devnet.solana.com");

const contractPublicKey = new PublicKey("YourContractPublicKey");


async function fetchData() {
    const accountInfo = await connection.getAccountInfo(contractPublicKey);
    if (accountInfo) {
        // accountInfo.data is a Buffer. Decode it according to your contract’s schema.
        console.log(accountInfo.data);
    } else {
        console.error("No account data found.");
    }
}