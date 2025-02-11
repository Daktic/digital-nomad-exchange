use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::instruction::Instruction;

// Our Factory ID
declare_id!("F4GTZaky3u6tNQBmYEEzPbpSCVPaKc3ZYjzVpM8NEx3Y");

#[program]
pub mod dne_factory {
    use super::*;
    pub fn initialize_pool(ctx: Context<InitializePool>, bump: u8) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.owner = *ctx.accounts.owner.key;
        pool.bump = bump;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 16,
        seeds = [b"liquidity_pool", owner.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, PoolState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PoolState {
    pub owner: Pubkey,
    pub bump: u8,
}