use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("D4JCMSe8bh1GcuPyGjicJ4JbdcmWmAPLvcuDqgpVSWFB");

#[program]
pub mod digital_nomad_exchange {
    use super::*;

    // First we initialize the program with the program context.
    // This is the entry point for the program.
    // It will create a new Liquidity Pool account and mint LP tokens to the user.
    pub fn initialize(ctx: Context<CreateLiquidityPool>) -> Result<()> {
        let liquidity_pool = &mut ctx.accounts.liquidity_pool;
        // Initialize the liquidity pool account
        liquidity_pool.token_a = ctx.accounts.token_a.key();
        liquidity_pool.token_b = ctx.accounts.token_b.key();
        liquidity_pool.lp_token = ctx.accounts.lp_token.key();
        liquidity_pool.owner = ctx.accounts.user.key();
        Ok(())
    }

    // The add_liquidity function will add liquidity to the pool.
    // It will transfer the token A and B from the user to the pool.
    // It will mint LP tokens to the user.
    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        // Transfer tokens from user to pool
        token::transfer(ctx.accounts.into_transfer_to_pool_a_context(), amount_a)?;
        token::transfer(ctx.accounts.into_transfer_to_pool_b_context(), amount_b)?;

        // Mint LP tokens to user
        let cpi_accounts = MintTo {
            mint: ctx.accounts.lp_token.to_account_info(),
            to: ctx.accounts.user_lp_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount_a + amount_b)?;

        Ok(())
    }
}

// The main account for the liquidity pool.
// It contains the two tokens and the LP token mint.
#[account]
#[derive(Default)]
pub struct LiquidityPool {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub lp_token: Pubkey,
    pub owner: Pubkey,
}

// The context for the initialize function.
// It contains the liquidity pool account, the two token accounts, the LP token mint, the user account, the system program and the rent sysvar.
#[derive(Accounts)]
pub struct CreateLiquidityPool<'info> {
    #[account(init, payer = user, space = 8 + 32 + 32 + 32 + 32)]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub token_a: Account<'info, TokenAccount>,
    pub token_b: Account<'info, TokenAccount>,
    pub lp_token: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

// The context for the add_liquidity function.
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token: Account<'info, Mint>,
    #[account(mut)]
    pub user_lp_token_account: Account<'info, TokenAccount>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// The add_liquidity function will add liquidity to the pool.
// the 'info lifetime is the lifetime of the function call.
// The function will transfer the token A and B from the user to the pool.
// It will mint LP tokens to the user.
impl<'info> AddLiquidity<'info> {
    fn into_transfer_to_pool_a_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.user_token_a.to_account_info(),
            to: self.lp_token_a.to_account_info(),
            authority: self.user.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    fn into_transfer_to_pool_b_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.user_token_b.to_account_info(),
            to: self.lp_token_b.to_account_info(),
            authority: self.user.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}