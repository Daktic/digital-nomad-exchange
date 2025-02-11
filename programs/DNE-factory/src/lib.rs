use anchor_lang::prelude::*;
use digital_nomad_exchange::LiquidityPool;

declare_id!("F4GTZaky3u6tNQBmYEEzPbpSCVPaKc3ZYjzVpM8NEx3Y");

#[program]
pub mod dne_factory {
    use super::*;
    pub fn initialize(ctx: Context<CreateFactory>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateFactory<'info> {
    #[account(init, payer = user, space = 8 + 32 + 8)]
    pub factory: Account<'info, LiquidityPool>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}