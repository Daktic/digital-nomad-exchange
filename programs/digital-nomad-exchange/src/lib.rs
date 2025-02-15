use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};
use anchor_spl::token::spl_token;
use anchor_spl::token::spl_token::error::TokenError::InvalidMint;

declare_id!("D4JCMSe8bh1GcuPyGjicJ4JbdcmWmAPLvcuDqgpVSWFB");

#[program]
pub mod digital_nomad_exchange {
    use super::*;

    // First we initialize the program with the program context.
    // This is the entry point for the program.
    // It will create a new Liquidity Pool account and mint LP tokens to the user.
    pub fn initialize(ctx: Context<CreateLiquidityPool>) -> Result<()> {
        let liquidity_pool = &mut ctx.accounts.liquidity_pool;

        let token_a = ctx.accounts.token_a_mint.key();
        let token_b = ctx.accounts.token_b_mint.key();

        liquidity_pool.token_a = token_a;
        liquidity_pool.token_b = token_b;
        liquidity_pool.lp_token_a = ctx.accounts.lp_token_a.key();
        liquidity_pool.lp_token_b = ctx.accounts.lp_token_b.key();

        liquidity_pool.lp_token = ctx.accounts.lp_token.key();
        liquidity_pool.owner = ctx.accounts.user.key();
        Ok(())
    }

    // The add_liquidity function will add liquidity to the pool.
    // It will transfer the token A and B from the user to the pool.
    // It will mint LP tokens to the user.
    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        let bump = ctx.bumps.liquidity_pool;

        // Transfer tokens from user to pool
        ctx.accounts.transfer_to_pool_a(amount_a)?;
        ctx.accounts.transfer_to_pool_b(bump, amount_b)?;

        // Create Mint LP transaction
        let cpi_accounts = MintTo {
            mint: ctx.accounts.lp_token.to_account_info(),
            to: ctx.accounts.user_lp_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // calculate amount to mint:
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(
            LPDepositRequest {
                token_a_balance: ctx.accounts.lp_token_a.amount,
                token_a_decimals: ctx.accounts.mint_a.decimals,
                token_b_balance: ctx.accounts.lp_token_b.amount,
                token_b_decimals: ctx.accounts.mint_b.decimals,
                lp_token_balance: ctx.accounts.lp_token.supply,
                lp_token_decimals: ctx.accounts.lp_token.decimals,
                token_a_amount: amount_a,
                token_b_amount: amount_b,
            }
        );

        // Execute Mint LP transaction
        token::mint_to(cpi_ctx, amount_to_mint)?;

        Ok(())
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {

        let bump = ctx.bumps.liquidity_pool;


        // Burn LP tokens from user
        ctx.accounts.burn(bump, amount)?;

        // Calculate amount to transfer for each token
        let (amount_a, amount_b) = LiquidityPool::calculate_token_amount_to_remove(
            amount,
            ctx.accounts.lp_token.supply,
            ctx.accounts.lp_token_a.amount,
            ctx.accounts.lp_token_b.amount
        );

        // Transfer tokens to user
        ctx.accounts.transfer_from_pool_a(bump, amount_a)?;
        ctx.accounts.transfer_from_pool_b(bump, amount_b)?;

        Ok(())
    }

    pub fn swap_tokens(ctx: Context<SwapTokens>, amount: u64, reverse: Option<bool>) -> Result<()> {
        msg!("Start Swap");
        let bump = ctx.bumps.liquidity_pool;


        msg!("User Token A: {:?}", ctx.accounts.user_token_a);
        msg!("lp Token A: {:?}", ctx.accounts.lp_token_a);
        msg!("Mint A: {:?}", ctx.accounts.mint_a);
        msg!("Mint B: {:?}", ctx.accounts.mint_b.key());

        // Depending on the token the user is swapping, we need to transfer the tokens from the user to the pool
        let (token_in, token_mint_in, token_out, token_mint_out) = if reverse.unwrap_or(false) {
            (
                ctx.accounts.user_token_a.clone(),
                ctx.accounts.mint_a.key(),
                ctx.accounts.user_token_b.clone(),
                ctx.accounts.mint_b.key(),
            )
        } else {
            (
                ctx.accounts.user_token_b.clone(),
                ctx.accounts.mint_b.key(),
                ctx.accounts.user_token_a.clone(),
                ctx.accounts.mint_a.key(),
            )
        };

        msg!("Got stuff");

        // Calculate amount to transfer for token B
        let amount_b = LiquidityPool::calculate_swap(
            token_in.amount,
            token_out.amount,
            amount
        );

        // Transfer tokens from user to pool
        msg!("Swap user 2 Pool");
        ctx.accounts.transfer_from_user_to_pool(&token_mint_in, amount)?;

        msg!("Swap Pool 2 user");
        // Transfer tokens to user
        ctx.accounts.transfer_from_pool_to_user(&token_mint_out, amount_b, bump)?;

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
    pub lp_token_a: Pubkey,
    pub lp_token_b: Pubkey,
    pub lp_token: Pubkey,
    pub owner: Pubkey,
}

#[derive(Debug)]
struct LPDepositRequest {
    token_a_balance: u64,
    token_a_decimals: u8,
    token_b_balance: u64,
    token_b_decimals: u8,
    lp_token_balance: u64,
    lp_token_decimals: u8,
    token_a_amount: u64,
    token_b_amount: u64,
}

impl LiquidityPool {

    fn calculate_lp_amount_to_mint(deposit_request: LPDepositRequest) -> u64 {
        // Check if the pool has no liquidity
        if deposit_request.token_a_balance == 0 && deposit_request.token_b_balance == 0 {
            // Special case for initialization, we mint the LP tokens to the user
            LiquidityPool::calculate_lp_token_amount_for_initial_deposit(deposit_request)
        } else {
            // Calculate the amount of LP tokens to mint
            LiquidityPool::calculate_lp_token_amount_for_standard_deposit(deposit_request)
        }
    }

    fn calculate_lp_token_amount_for_standard_deposit(deposit_request: LPDepositRequest) -> u64 {
        // Calculate the amount of LP tokens to mint

        // Total LP amount * min(amount_a / reserve_a, amount_b / reserve_b)
        (deposit_request.lp_token_balance as f64 * f64::min(
            deposit_request.token_a_amount as f64 / deposit_request.token_a_balance as f64,
            deposit_request.token_b_amount as f64 / deposit_request.token_b_balance as f64,
        )) as u64
    }

    fn calculate_lp_token_amount_for_initial_deposit(deposit_request: LPDepositRequest) -> u64 {
        // Calculate the amount of LP tokens to mint
        // Special case for initialization, we mint the LP tokens to the user
        // Check if overflow
        match deposit_request.token_a_amount.checked_mul(deposit_request.token_b_amount) {
            Some(amount) => (amount as f64).sqrt() as u64,
            None => {
                // Overflow, use the decimals to re multiply
                let adjusted_amount_a = deposit_request.token_a_amount as f64 / 10f64.powi(deposit_request.token_a_decimals as i32);
                let adjusted_amount_b = deposit_request.token_b_amount as f64 / 10f64.powi(deposit_request.token_b_decimals as i32);
                // We then need to transfer the decimal places to the LP token amount
                (((adjusted_amount_a * adjusted_amount_b).sqrt()) * 10f64.powi(deposit_request.lp_token_decimals as i32)) as u64
            },
        }
    }

    fn calculate_token_amount_to_remove(lp_token_amount: u64, lp_token_supply: u64, token_a_balance: u64, token_b_balance: u64) -> (u64, u64) {
        // Calculate the amount of tokens to remove
        let lp_ratio = lp_token_amount as f64 / lp_token_supply as f64;
        let amount_a = (token_a_balance as f64 * lp_ratio) as u64;
        let amount_b = (token_b_balance as f64 * lp_ratio) as u64;
        (amount_a, amount_b)
    }

    fn calculate_swap(token_balance_a: u64, token_balance_b: u64, amount: u64) -> u64 {
        // Calculate the amount of tokens to swap
        // Add token balance a and amount to get the updated affect on the pool
        // Check if overflow
        match token_balance_a.checked_mul(token_balance_b) {
            Some(product) => {
                // Calculate the new balance of token a using the constant product formula
                let amount_a_new = token_balance_a + amount;
                // Calculate the new balance of token b using the constant product formula
                let amount_b_new = (product / amount_a_new).min(token_balance_b);
                // Return the difference between the old and new balance of token b
                token_balance_b - amount_b_new
            },
            None => {
                // Overflow, use the decimals to re multiply
                let adjusted_token_balance_a = token_balance_a as f64 / 10f64.powi(9);
                let adjusted_token_balance_b = token_balance_b as f64 / 10f64.powi(9);
                let adjusted_amount = amount as f64 / 10f64.powi(9);
                // Calculate the new balance of token a using the constant product formula
                let amount_a_new = adjusted_token_balance_a + adjusted_amount;
                // Calculate the new balance of token b using the constant product formula
                let amount_b_new = (adjusted_token_balance_a * adjusted_token_balance_b) / amount_a_new;
                // We then need to transfer the decimal places to the LP token amount
                ((amount_b_new * 10f64.powi(9)) as u64).min(token_balance_b)
            }
        }
    }

    fn sort_pubkeys(pubkey_a: Pubkey, pubkey_b: Pubkey) -> (Pubkey, Pubkey) {
        if pubkey_a < pubkey_b {
            (pubkey_a, pubkey_b)
        } else {
            (pubkey_b, pubkey_a)
        }
    }
}

// The context for the initialize function.
// It contains the liquidity pool account, the two token accounts, the LP token mint, the user account, the system program and the rent sysvar.
#[derive(Accounts)]
pub struct CreateLiquidityPool<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + (6 * 32),
        // This enforces that the tokens are provided in sorted order by the client
        constraint = token_a_mint.key() < token_b_mint.key(),
        seeds = [b"liquidity_pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    pub lp_token: Account<'info, Mint>,
    // Need to initialize the token accounts for the PDA
    // Create the pool's token-account for token A
    #[account(
        init,
        payer = user,
        token::mint = token_a_mint,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_a", token_a_mint.key().as_ref()],
        bump
    )]
    pub lp_token_a: Account<'info, TokenAccount>,

    // Create the pool's token-account for token B
    #[account(
        init,
        payer = user,
        token::mint = token_b_mint,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", token_b_mint.key().as_ref()],
        bump
    )]
    pub lp_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(address = spl_token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

// The context for the add_liquidity function.
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        constraint = mint_a.key() < mint_b.key(),
        seeds = [b"liquidity_pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump,
    )]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub mint_a: Account<'info, Mint>,
    #[account(mut, constraint = user_token_a.mint == mint_a.key())]
    pub user_token_a: Account<'info, TokenAccount>,
    pub mint_b: Account<'info, Mint>,
    #[account(mut, constraint = user_token_b.mint == mint_b.key())]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_a,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_a", mint_a.key().as_ref()],
        bump
    )]
    pub lp_token_a: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_b,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", mint_b.key().as_ref()],
        bump
    )]
    pub lp_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token: Account<'info, Mint>,
    #[account(mut)]
    pub user_lp_token_account: Account<'info, TokenAccount>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// The add_liquidity function will add liquidity to the pool.
// the info lifetime is the lifetime of the function call.
// The function will transfer the token A and B from the user to the pool.
// It will mint LP tokens to the user.
impl<'info> AddLiquidity<'info> {
    fn transfer_to_pool_a(&self, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.user_token_a.to_account_info(),
            to: self.lp_token_a.to_account_info(),
            authority: self.user.to_account_info(),
        };

        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                cpi_accounts,
            ),
            amount
        )
    }

    fn transfer_to_pool_b(&self, bump:u8, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.user_token_b.to_account_info(),
            to: self.lp_token_b.to_account_info(),
            authority: self.user.to_account_info(),
        };
        // Build the seeds array to match how LiquidityPool PDA was derived
        let mint_a = self.mint_a.key();
        let mint_b = self.mint_b.key();
        let seeds = &[
            b"liquidity_pool",
            mint_a.as_ref(),
            mint_b.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds
            ),
            amount
        )
    }
}

// The context for removing liquidity from the pool
#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(
        mut,
        constraint = mint_a.key() < mint_b.key(),
        seeds = [b"liquidity_pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump,
    )]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub mint_a: Account<'info, Mint>,
    #[account(mut, constraint = user_token_a.mint == mint_a.key())]
    pub user_token_a: Account<'info, TokenAccount>,
    pub mint_b: Account<'info, Mint>,
    #[account(mut, constraint = user_token_b.mint == mint_b.key())]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_a,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_a", mint_a.key().as_ref()],
        bump
    )]
    pub lp_token_a: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_b,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", mint_b.key().as_ref()],
        bump
    )]
    pub lp_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token: Account<'info, Mint>,
    #[account(mut)]
    pub user_lp_token_account: Account<'info, TokenAccount>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


// The remove_liquidity function will remove liquidity from the pool.
// The function will burn the LP tokens from the user.
// It will transfer token A and B to the user proportional to the pools reserves.
impl<'info>RemoveLiquidity<'info> {
    fn transfer_from_pool_a(&self, bump:u8, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.lp_token_a.to_account_info(),
            to: self.user_token_a.to_account_info(),
            authority: self.liquidity_pool.to_account_info(),
        };
        // Build the seeds array to match how LiquidityPool PDA was derived
        let mint_a = self.mint_a.key();
        let mint_b = self.mint_b.key();
        let seeds = &[
            b"liquidity_pool",
            mint_a.as_ref(),
            mint_b.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds
            ),
            amount
        )
    }

    fn transfer_from_pool_b(&self, bump:u8, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.lp_token_b.to_account_info(),
            to: self.user_token_b.to_account_info(),
            authority: self.liquidity_pool.to_account_info()
        };
        // Build the seeds array to match how your LiquidityPool PDA was derived
        // Build the seeds array to match how LiquidityPool PDA was derived
        let mint_a = self.mint_a.key();
        let mint_b = self.mint_b.key();
        let seeds = &[
            b"liquidity_pool",
            mint_a.as_ref(),
            mint_b.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds
            ),
            amount
        )
    }

    fn burn(&self, bump:u8, amount: u64) -> Result<()> {
        let cpi_accounts = Burn {
            mint: self.lp_token.to_account_info(),
            from: self.user_lp_token_account.to_account_info(),
            authority: self.user.to_account_info(),
        };
        // Build the seeds array to match how your LiquidityPool PDA was derived
        // Build the seeds array to match how LiquidityPool PDA was derived
        let mint_a = self.mint_a.key();
        let mint_b = self.mint_b.key();
        let seeds = &[
            b"liquidity_pool",
            mint_a.as_ref(),
            mint_b.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::burn(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds
            ),
            amount
        )
    }
}

// The swap tokens context is the main purpose of the liquidity pool.
// It will swap tokens in the pool on a dynamic ratio.
// It will take a fee for the swap that is splits amongst the liquidity providers
#[derive(Accounts)]
pub struct SwapTokens<'info> {
    #[account(
        mut,
        constraint = mint_a.key() < mint_b.key(),
        seeds = [b"liquidity_pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump,
    )]
    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub mint_a: Account<'info, Mint>,
    #[account(mut, constraint = user_token_a.mint == mint_a.key())]
    pub user_token_a: Account<'info, TokenAccount>,
    pub mint_b: Account<'info, Mint>,
    #[account(mut, constraint = user_token_b.mint == mint_b.key())]
    pub user_token_b: Account<'info, TokenAccount>,
    // Get the pool's token-account for token A
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_a,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_a", mint_a.key().as_ref()],
        bump
    )]
    pub lp_token_a: Account<'info, TokenAccount>,
    // Get the pool's token-account for token B
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_b,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", mint_b.key().as_ref()],
        bump
    )]
    pub lp_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token: Account<'info, Mint>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info>SwapTokens<'info> {
    fn transfer_from_user_to_pool(&self, token_mint: &Pubkey, amount: u64) -> Result<()> {
        msg!("Transfer from user to pool Started");

        let (user_account, lp_account) = self.get_matching_accounts(token_mint);

        let cpi_accounts = Transfer {
            from: user_account,
            to: lp_account,
            authority: self.user.to_account_info(),
        };

        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                cpi_accounts
            ),
            amount
        )?;
        msg!("Transfer from user to pool successful");
        Ok(())
    }

    fn transfer_from_pool_to_user(
        &self,
        token_mint: &Pubkey,
        amount: u64,
        bump: u8,
    ) -> Result<()> {

        // Determine which token the user is swapping to
        let (user_account, lp_account) = self.get_matching_accounts(token_mint);

        let cpi_accounts = Transfer {
            from: lp_account,
            to: user_account,
            // This field means “the address that must sign the token::transfer”
            authority: self.liquidity_pool.to_account_info(),
        };

        // Build the seeds array to match how LiquidityPool PDA was derived
        msg!("Getting Mints");
        let mint_a = self.mint_a.key();
        msg!("Mint A: {:?}", self.mint_a.key());
        let mint_b = self.mint_b.key();
        msg!("Mint B: {}", &mint_b);
        let seeds = &[
            b"liquidity_pool",
            mint_a.as_ref(),
            mint_b.as_ref(),
            &[bump],
        ];
        msg!("Seeds: {:?}", seeds);
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds
            ),
            amount
        )
    }

    fn get_matching_accounts(&self, token_mint: &Pubkey) -> (AccountInfo<'info>, AccountInfo<'info>) {
        // Here we get the mint of the two tokens, and we check which one the user is trying to swap
        if token_mint == &self.mint_a.key() {
            // If the user is trying to swap token A, we transfer from the user to the pool's token A account
            (self.user_token_a.to_account_info(), self.lp_token_a.to_account_info())
        } else if token_mint == &self.mint_b.key() {
            // Otherwise, we transfer from the user to the pool's token B account
            (self.user_token_b.to_account_info(), self.lp_token_b.to_account_info())
        } else {
            panic!("Token not in pool!");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_lp_token_amount_for_initial_deposit() {
        let deposit_request = LPDepositRequest {
            token_a_balance: 0,
            token_a_decimals: 9,
            token_b_balance: 0,
            token_b_decimals: 9,
            lp_token_balance: 0,
            lp_token_decimals: 9,
            token_a_amount: 1000,
            token_b_amount: 1000,
        };
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(deposit_request);
        assert_eq!(amount_to_mint, 1000, "Initial deposit should mint 1000 LP tokens");
    }

    #[test]
    fn test_calculate_lp_token_amount_for_standard_deposit() {
        let deposit_request = LPDepositRequest {
            token_a_balance: 1000,
            token_a_decimals: 9,
            token_b_balance: 1000,
            token_b_decimals: 9,
            lp_token_balance: 1000,
            lp_token_decimals: 9,
            token_a_amount: 500,
            token_b_amount: 500,
        };
        let change_token_a = deposit_request.token_a_amount as f64 / deposit_request.token_a_balance as f64;
        let change_token_b = deposit_request.token_b_amount as f64 / deposit_request.token_b_balance as f64;
        let expected_amount = (deposit_request.lp_token_balance as f64 * f64::min(
            change_token_a,
            change_token_b,
        )) as u64;
        // Should be 1000 * 0.5 = 500
        assert_eq!(expected_amount, 500, "Standard deposit should mint 500 LP tokens");
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(deposit_request);

        assert_eq!(amount_to_mint, expected_amount, "Standard deposit should mint 500 LP tokens");
    }

    #[test]
    fn test_calculate_lp_token_amount_for_unequal_deposit() {
        let deposit_request = LPDepositRequest {
            token_a_balance: 1000,
            token_a_decimals: 9,
            token_b_balance: 1000,
            token_b_decimals: 9,
            lp_token_balance: 1000,
            lp_token_decimals: 9,
            token_a_amount: 100,
            token_b_amount: 500,
        };
        let change_token_a = deposit_request.token_a_amount as f64 / deposit_request.token_a_balance as f64;
        let change_token_b = deposit_request.token_b_amount as f64 / deposit_request.token_b_balance as f64;
        let expected_amount = (deposit_request.lp_token_balance as f64 * f64::min(
            change_token_a,
            change_token_b,
        )) as u64;
        // Should be 1000 * 0.1 = 100
        assert_eq!(expected_amount, 100, "Standard deposit should mint 500 LP tokens");
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(deposit_request);

        assert_eq!(amount_to_mint, expected_amount, "Standard deposit should mint 500 LP tokens");
    }

    #[test]
    fn test_calculate_lp_token_amount_initial_large_amounts() {
        let deposit_request = LPDepositRequest {
            token_a_balance: 0,
            token_a_decimals: 9,
            token_b_balance: 0,
            token_b_decimals: 9,
            lp_token_balance: 1_000_000_000,
            lp_token_decimals: 9,
            token_a_amount: 500_000_000_000,
            token_b_amount: 500_000_000_000,
        };
        let expected_amount = (((deposit_request.token_a_amount as f64 / 10f64.powi(deposit_request.token_a_decimals as i32)
            * deposit_request.token_b_amount as f64 / 10f64.powi(deposit_request.token_b_decimals as i32)).sqrt()) * 10f64.powi(9)) as u64;
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(deposit_request);

        assert_eq!(amount_to_mint, expected_amount as u64, "Standard deposit should mint 500 LP tokens");
    }

    #[test]
    fn test_calculate_lp_tokens_amount_initial_different_decimals() {
        let deposit_request = LPDepositRequest {
            token_a_balance: 0,
            token_a_decimals: 6,
            token_b_balance: 0,
            token_b_decimals: 9,
            lp_token_balance: 1_000_000_000,
            lp_token_decimals: 9,
            token_a_amount: 500_000_000_000,
            token_b_amount: 500_000_000_000,
        };

        let expected_amount = (((deposit_request.token_a_amount as f64 / 10f64.powi(deposit_request.token_a_decimals as i32)
            * deposit_request.token_b_amount as f64 / 10f64.powi(deposit_request.token_b_decimals as i32)).sqrt()) * 10f64.powi(9)) as u64;
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(deposit_request);

        assert_eq!(amount_to_mint, expected_amount as u64, "Standard deposit should mint 500 LP tokens");
    }

    #[test]
    fn test_calculate_lp_tokens_amount_different_decimals() {
        let deposit_request = LPDepositRequest {
            token_a_balance: 1000,
            token_a_decimals: 3,
            token_b_balance: 1000,
            token_b_decimals: 9,
            lp_token_balance: 1000,
            lp_token_decimals: 9,
            token_a_amount: 500,
            token_b_amount: 500,
        };

        let change_token_a = deposit_request.token_a_amount as f64 / deposit_request.token_a_balance as f64;
        let change_token_b = deposit_request.token_b_amount as f64 / deposit_request.token_b_balance as f64;
        let expected_amount = (deposit_request.lp_token_balance as f64 * f64::min(
            change_token_a,
            change_token_b,
        )) as u64;
        // Should be 1000 * 0.5 = 500
        assert_eq!(expected_amount, 500, "Deposit should mint 500 LP tokens");
        let amount_to_mint = LiquidityPool::calculate_lp_amount_to_mint(deposit_request);

        assert_eq!(amount_to_mint, expected_amount, "Deposit should mint 500 LP tokens");
    }

    #[test]
    fn test_remove_liquidity_standard_withdrawal() {
        let lp_token_amount = 100;
        let lp_token_supply = 1_000;
        let token_a_balance = 1_000;
        let token_b_balance = 1_000;
        let (amount_a, amount_b) = LiquidityPool::calculate_token_amount_to_remove(lp_token_amount, lp_token_supply, token_a_balance, token_b_balance);
        assert_eq!(amount_a, 100, "Should withdraw 10 token A");
        assert_eq!(amount_b, 100, "Should withdraw 10 token B");

    }

    #[test]
    fn test_remove_liquidity_withdrawal_unequal_amounts() {
        let lp_token_amount = 100;
        let lp_token_supply = 1_300;
        let token_a_balance = 13_400;
        let token_b_balance = 342;
        let (amount_a, amount_b) = LiquidityPool::calculate_token_amount_to_remove(lp_token_amount, lp_token_supply, token_a_balance, token_b_balance);
        assert_eq!(amount_a, 1030, "Should withdraw 100 token A");
        assert_eq!(amount_b, 26, "Should withdraw 100 token B");
    }

    #[test]
    fn test_remove_liquidity_withdrawal_large_amounts() {
        let lp_token_amount = 100;
        let lp_token_supply = 1_000;
        let token_a_balance = 1_000 * 10u64.pow(9);
        let token_b_balance = 1_000* 10u64.pow(9);
        let (amount_a, amount_b) = LiquidityPool::calculate_token_amount_to_remove(lp_token_amount, lp_token_supply, token_a_balance, token_b_balance);
        assert_eq!(amount_a, 100 * 10u64.pow(9), "Should withdraw 100 token A");
        assert_eq!(amount_b, 100 * 10u64.pow(9), "Should withdraw 100 token B");
    }

    #[test]
    fn test_calculate_token_swap_amount() {
        let token_balance_a = 1000;
        let token_balance_b = 1000;
        let amount = 100;
        let amount_b = LiquidityPool::calculate_swap(token_balance_a, token_balance_b, amount);
        assert_eq!(amount_b, 91, "Should swap 90.909 ~91 token B");
    }

    #[test]
    fn test_calculate_token_swap_amount_unequal_pool() {
        let token_balance_a = 34556;
        let token_balance_b = 12345;
        let amount = 100;
        let amount_b = LiquidityPool::calculate_swap(token_balance_a, token_balance_b, amount);
        assert_eq!(amount_b, 36, "Should swap 36.04 ~36 token B");
    }

    #[test]
    fn test_calculate_token_swap_amount_large_numbers() {
        let token_balance_a = 1000 * 10u64.pow(9);
        let token_balance_b = 1000 * 10u64.pow(9);
        let amount = 100 * 10u64.pow(9);
        let amount_b = LiquidityPool::calculate_swap(token_balance_a, token_balance_b, amount);
        assert_eq!(amount_b, 909090909090, "Should swap large number of token B");
    }

    #[test]
    fn test_print_bytes_of_address() {
        use std::str::FromStr;
        let address = Pubkey::from_str("D4JCMSe8bh1GcuPyGjicJ4JbdcmWmAPLvcuDqgpVSWFB").unwrap();
        let bytes = address.to_bytes();
        println!("{:?}", bytes);
        assert_eq!(bytes, [179, 36, 109, 199, 29, 35, 224, 187, 140, 184, 103, 132, 24, 111, 50, 110, 230, 100, 210, 140, 213, 176, 129, 44, 188, 185, 6, 150, 120, 221, 184, 18], "Should print the bytes of the address");
    }
}