use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::error::TokenError::InvalidMint;
use anchor_spl::token_interface::{
    spl_token_2022,
    Mint, MintTo, Burn, TokenAccount, TokenInterface, Transfer,
    mint_to, transfer, burn
};

use fixed::types::I64F64;

declare_id!("HFMM2nW3ARsBFEKsQnx5mxrTThMKiMGkyETeJ5i2zgNx");

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

        msg!("Token A (MINT): {}", liquidity_pool.token_a);
        msg!("Token B (MINT): {}", liquidity_pool.token_b);

        Ok(())
    }

    pub fn initialize_pda(ctx: Context<CreateLiquidityPoolPDA>) -> Result<()> {
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
        mint_to(cpi_ctx, amount_to_mint)?;

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
        let bump = ctx.bumps.liquidity_pool;

        // Depending on the token the user is swapping, we need to transfer the tokens from the user to the pool
        // Would like to refactor this in the future to use a struct to be more compact
        let (token_in, token_mint_in, token_mint_in_decimals,
            token_out, token_mint_out,token_mint_out_decimals,
        ) = if reverse.unwrap_or(false) {
            (
                ctx.accounts.lp_token_b.clone(),
                ctx.accounts.mint_b.key(),
                ctx.accounts.mint_b.decimals,
                ctx.accounts.lp_token_a.clone(),
                ctx.accounts.mint_a.key(),
                ctx.accounts.mint_a.decimals,
            )
        } else {
            (
                ctx.accounts.lp_token_a.clone(),
                ctx.accounts.mint_a.key(),
                ctx.accounts.mint_a.decimals,
                ctx.accounts.lp_token_b.clone(),
                ctx.accounts.mint_b.key(),
                ctx.accounts.mint_b.decimals,
            )
        };



        msg!("Amount in pool A: {}", ctx.accounts.lp_token_a.amount);
        msg!("Amount in pool B: {}", ctx.accounts.lp_token_b.amount);
        // Calculate amount to transfer for token B
        let amount_b = LiquidityPool::calculate_swap(
            token_in.amount,
            token_mint_in_decimals,
            token_out.amount,
            token_mint_out_decimals,
            amount
        );
        msg!("Swapping {} from {} for {} from {}", amount,token_in.key() , amount_b, token_out.key());

        // Transfer tokens from user to pool
        ctx.accounts.transfer_from_user_to_pool(&token_mint_in, amount, bump)?;

        // Transfer tokens to user
        ctx.accounts.transfer_from_pool_to_user(&token_mint_out, amount_b, bump)?;
        // panic!("End of swap");
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
    const FEE_PERCENTAGE: f64 = 0.003; // 0.3% fee

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

    fn calculate_swap(
        token_balance_in: u64,
        token_in_decimals: u8,
        token_balance_out: u64,
        token_out_decimals: u8,
        amount: u64,
    ) -> u64 {
        let fee_percentage = I64F64::from_num(Self::FEE_PERCENTAGE);
        let amount_in_adjusted = I64F64::from_num(amount) * (I64F64::from_num(1) - fee_percentage);
        msg!("Amount in adjusted for fee: {}", amount_in_adjusted);

        let token_balance_a_adjusted = I64F64::from_num(token_balance_in)
            / I64F64::from_num(10u64.pow(token_in_decimals as u32));
        msg!("Token balance token_balance_a_adjusted: {}", token_balance_a_adjusted);

        let token_balance_b_adjusted = I64F64::from_num(token_balance_out)
            / I64F64::from_num(10u64.pow(token_out_decimals as u32));
        msg!("Token balance token_balance_b_adjusted: {}", token_balance_b_adjusted);

        let amount_adjusted = amount_in_adjusted
            / I64F64::from_num(10u64.pow(token_in_decimals as u32));
        msg!("Amount adjusted: {}", amount_adjusted);

        let product = token_balance_a_adjusted * token_balance_b_adjusted;
        msg!("Product: {}", product);

        let new_balance_a = token_balance_a_adjusted + amount_adjusted;
        msg!("New balance A: {}", new_balance_a);

        let new_balance_b = product / new_balance_a;
        msg!("New balance B: {}", new_balance_b);

        let amount_out_adjusted = token_balance_b_adjusted - new_balance_b;
        msg!("Amount out adjusted: {}", amount_out_adjusted);

        let amount_out = amount_out_adjusted
            * I64F64::from_num(10u64.pow(token_out_decimals as u32));
        msg!("Amount out: {}", amount_out);

        let final_amount = amount_out.to_num::<u64>().min(token_balance_out);
        msg!("Final amount: {}", final_amount);

        final_amount
    }


    fn sort_pubkeys(pubkey_a: Pubkey, pubkey_b: Pubkey) -> (Pubkey, Pubkey) {
        if pubkey_a < pubkey_b {
            (pubkey_a, pubkey_b)
        } else {
            (pubkey_b, pubkey_a)
        }
    }
}

// Context for initializing the PDA
#[derive(Accounts)]
pub struct CreateLiquidityPoolPDA<'info> {
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
    pub token_a_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_b_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// The context for the initialize function.
// It contains the liquidity pool account, the two token accounts, the LP token mint, the user account, the system program and the rent sysvar.
#[derive(Accounts)]
pub struct CreateLiquidityPool<'info> {
    #[account(
        // This enforces that the tokens are provided in sorted order by the client
        constraint = token_a_mint.key() < token_b_mint.key(),
        seeds = [b"liquidity_pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        mut,
        bump
    )]
    pub liquidity_pool: Box<Account<'info, LiquidityPool>>,
    pub token_a_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_b_mint: Box<InterfaceAccount<'info, Mint>>,
    pub lp_token: Box<InterfaceAccount<'info, Mint>>,
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
    pub lp_token_a: Box<InterfaceAccount<'info, TokenAccount>>,

    // Create the pool's token-account for token B
    #[account(
        init,
        payer = user,
        token::mint = token_b_mint,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", token_b_mint.key().as_ref()],
        bump
    )]
    pub lp_token_b: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(address = spl_token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
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
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account(mut, constraint = user_token_a.mint == mint_a.key())]
    pub user_token_a: InterfaceAccount<'info, TokenAccount>,
    pub mint_b: InterfaceAccount<'info, Mint>,
    #[account(mut, constraint = user_token_b.mint == mint_b.key())]
    pub user_token_b: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_a,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_a", mint_a.key().as_ref()],
        bump
    )]
    pub lp_token_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_b,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", mint_b.key().as_ref()],
        bump
    )]
    pub lp_token_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    #[account(address = spl_token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
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

        transfer(
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

        transfer(
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
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account(mut, constraint = user_token_a.mint == mint_a.key())]
    pub user_token_a: InterfaceAccount<'info, TokenAccount>,
    pub mint_b: InterfaceAccount<'info, Mint>,
    #[account(mut, constraint = user_token_b.mint == mint_b.key())]
    pub user_token_b: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_a,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_a", mint_a.key().as_ref()],
        bump
    )]
    pub lp_token_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        token::mint = mint_b,
        token::authority = liquidity_pool,
        seeds = [b"pool_token_b", mint_b.key().as_ref()],
        bump
    )]
    pub lp_token_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lp_token: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    #[account(address = spl_token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
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

        transfer(
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

        transfer(
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

        burn(
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
    pub liquidity_pool: Box<Account<'info, LiquidityPool>>,
    pub mint_a: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, constraint = user_token_a.mint == mint_a.key())]
    pub user_token_a: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint_b: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, constraint = user_token_b.mint == mint_b.key())]
    pub user_token_b: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, constraint = lp_token_a.mint == mint_a.key())]
    pub lp_token_a: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, constraint = lp_token_b.mint == mint_b.key())]
    pub lp_token_b: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub lp_token: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    #[account(address = spl_token_2022::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}


impl<'info>SwapTokens<'info> {
    fn transfer_from_user_to_pool(&self, token_mint: &Pubkey, amount: u64, bump:u8) -> Result<()> {

        msg!("Transferring tokens from user to pool");
        let (user_account, lp_account) = self.get_matching_accounts(token_mint);

        msg!("Transfering {} from user {} to pool {}", amount, user_account.key(), lp_account.key());

        let cpi_accounts = Transfer {
            from: user_account,
            to: lp_account,
            authority: self.user.to_account_info(),
        };

        transfer(
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

        msg!("Transfering {} from pool {} to user {}", amount, user_account.key(), lp_account.key());

        let cpi_accounts = Transfer {
            from: lp_account,
            to: user_account,
            // This field means “the address that must sign the transfer”
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

        transfer(
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
        let fee_percentage = 0.003;
        let amount_after_fee = amount as f64 * (1.0 - fee_percentage);
        let expected_amount_b = (amount_after_fee * token_balance_b as f64 / (token_balance_a as f64 + amount_after_fee)) as u64;
        let amount_b = LiquidityPool::calculate_swap(token_balance_a,9, token_balance_b,9, amount);
        assert_eq!(amount_b, expected_amount_b, "Should swap 90.66 ~round down to 90 token B");
    }

    #[test]
    fn test_calculate_token_swap_amount_unequal_pool() {
        let token_balance_a = 34556;
        let token_balance_b = 12345;
        let amount = 100;
        let fee_percentage = 0.003;
        let amount_after_fee = amount as f64 * (1.0 - fee_percentage);
        let expected_amount_b = (amount_after_fee * token_balance_b as f64 / (token_balance_a as f64 + amount_after_fee)) as u64;
        let amount_b = LiquidityPool::calculate_swap(token_balance_a,9, token_balance_b,9, amount);
        assert_eq!(amount_b, 35, "Should swap 35.5 ~35 token B");
    }

    #[test]
    fn test_calculate_token_swap_amount_large_numbers() {
        let token_balance_a = 1000 * 10u64.pow(9);
        let token_balance_b = 1000 * 10u64.pow(9);
        let amount = 100 * 10u64.pow(9);
        let fee_percentage = 0.003;
        let amount_after_fee = amount as f64 * (1.0 - fee_percentage);
        let expected_amount_b = (amount_after_fee * token_balance_b as f64 / (token_balance_a as f64 + amount_after_fee)) as u64;
        let amount_b = LiquidityPool::calculate_swap(token_balance_a, 9, token_balance_b, 9, amount);
        assert_eq!(amount_b, expected_amount_b, "Should swap large number of token B");
    }

    #[test]
    fn test_calculate_token_swap_integration_parity() {
        let token_balance_a = 1_000_000_000;
        let token_balance_b = 500_000_000;
        let amount = 100_000;
        let fee_percentage = 0.003;
        let amount_after_fee = amount as f64 * (1.0 - fee_percentage);
        let expected_amount_b = (amount_after_fee * token_balance_b as f64 / (token_balance_a as f64 + amount_after_fee)) as u64;
        let amount_b = LiquidityPool::calculate_swap(token_balance_a, 9, token_balance_b, 9, amount);
        assert_eq!(amount_b, expected_amount_b, "Should swap speicifc number of token B: 49845");
    }

    #[test]
    fn test_print_bytes_of_address() {
        use std::str::FromStr;
        let address = Pubkey::from_str("D4JCMSe8bh1GcuPyGjicJ4JbdcmWmAPLvcuDqgpVSWFB").unwrap();
        let bytes = address.to_bytes();
        println!("{:?}", bytes);
        assert_eq!(bytes, [179, 36, 109, 199, 29, 35, 224, 187, 140, 184, 103, 132, 24, 111, 50, 110, 230, 100, 210, 140, 213, 176, 129, 44, 188, 185, 6, 150, 120, 221, 184, 18], "Should print the bytes of the address");
    }

    #[test]
    fn test_liquidity_pool_size() {
        // This returns the size of LiquidityPool in bytes.
        let size = std::mem::size_of::<LiquidityPool>();
        println!("LiquidityPool size: {}", size);

        // If LiquidityPool struct is defined as:
        // pub struct LiquidityPool {
        //     pub token_a: Pubkey,
        //     pub token_b: Pubkey,
        //     pub lp_token_a: Pubkey,
        //     pub lp_token_b: Pubkey,
        //     pub lp_token: Pubkey,
        //     pub owner: Pubkey,
        // }
        // then its size should be 6 * 32 = 192 bytes.
        assert_eq!(size, 192);
    }
}