use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("D4JCMSe8bh1GcuPyGjicJ4JbdcmWmAPLvcuDqgpVSWFB");

#[program]
pub mod digital_nomad_exchange {
    use super::*;

    pub fn initialize(ctx: Context<CreateLiquidityPool>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}


#[account]
#[derive(Default)]
pub struct LiquidityPool {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub lp_mint: Pubkey,
    pub owner: Pubkey,
}

#[derive(Accounts)]
pub struct CreateLiquidityPool<'info> {
    #[account(init, payer = user, space = 8 + 32 + 32 + 32 + 32)]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub pool: Account<'info, LiquidityPool>,
    pub token_a: Account<'info, TokenAccount>,
    pub token_b: Account<'info, TokenAccount>,
    pub lp_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}