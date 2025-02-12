use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::instruction::Instruction;
use std::str::FromStr;


// Our Factory ID
declare_id!("F4GTZaky3u6tNQBmYEEzPbpSCVPaKc3ZYjzVpM8NEx3Y");

// The ID of the program we want to create
pub const LIQUIDITY_POOL_PROGRAM_ID: Pubkey = Pubkey::new_from_array( [179, 36, 109, 199, 29, 35, 224, 187, 140, 184, 103, 132, 24, 111, 50, 110, 230, 100, 210, 140, 213, 176, 129, 44, 188, 185, 6, 150, 120, 221, 184, 18]);

#[program]
pub mod dne_factory {
    use super::*;

    pub fn create_pool(ctx: Context<CreatePoolCpi>, amount: u64) -> Result<()> {
        let pool_program = ctx.accounts.pool_program.to_account_info();
        let pool_account = ctx.accounts.pool_account.to_account_info();
        let signer = ctx.accounts.signer.to_account_info();
        let system_program = ctx.accounts.system_program.to_account_info();

        // Derive the PDA
        let (pool_pda, bump) = Pubkey::find_program_address(
            &[b"liquidity_pool", signer.key().as_ref()],
            &LIQUIDITY_POOL_PROGRAM_ID
        );

        // Manually create the CPI instruction
        let instruction = Instruction {
            program_id: LIQUIDITY_POOL_PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(pool_pda, false),  // The new pool PDA
                AccountMeta::new_readonly(signer.key(), true), // The signer creating the pool
                AccountMeta::new_readonly(system_program.key(), false), // System program
            ],
            data: initialize_pool_data(amount, bump)?, // Serialize instruction data
        };

        invoke_signed(
            &instruction,
            &[
                pool_program,
                pool_account,
                signer.clone(),
                system_program
            ],
            &[&[b"liquidity_pool", signer.key().as_ref(), &[bump]]], // PDA seeds
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePoolCpi<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub pool_account: Account<'info, LiquidityPool>,
    /// CHECK: This is the liquidity pool program and is manually verified
    #[account(mut, address = LIQUIDITY_POOL_PROGRAM_ID)]
    pub pool_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

// Function to serialize instruction data
fn initialize_pool_data(amount: u64, bump: u8) -> Result<Vec<u8>> {
    let mut data = Vec::new();
    data.push(0); // Instruction index for "initialize"
    data.extend_from_slice(&amount.to_le_bytes()); // Append amount
    data.push(bump); // Append bump
    Ok(data)
}

#[account]
#[derive(Default)]
pub struct LiquidityPool {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub lp_token: Pubkey,
    pub owner: Pubkey,
}