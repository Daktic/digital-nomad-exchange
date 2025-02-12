import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DneFactory } from "../target/types/dne_factory";


describe("dne-factory", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.DneFactory as Program<DneFactory>;

    it("Creates a new liquidity pool", async () => {
        console.log("Creating a new liquidity pool");
    });
});