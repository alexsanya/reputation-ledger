use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct FundMe<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    /// CHECK: This is a PDA that will be used as the token account authority
    #[account(seeds = [b"vault-authority"], bump)]
    pub vault_authority: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(job_hash: [u8; 32])]
pub struct Estimate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<crate::state::Order>(),
        seeds = [b"order", user.key().as_ref(), job_hash.as_ref()],
        bump
    )]
    pub order: Account<'info, crate::state::Order>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Evaluate<'info> {
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
}

#[derive(Accounts)]
pub struct Commit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    /// CHECK: This is a PDA that will be used as the token account authority
    #[account(seeds = [b"vault-authority"], bump)]
    pub vault_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deliver<'info> {
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
}

#[derive(Accounts)]
pub struct Decline<'info> {
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is a PDA that will be used as the token account authority
    #[account(seeds = [b"vault-authority"], bump)]
    pub vault_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is a PDA that will be used as the token account authority
    #[account(seeds = [b"vault-authority"], bump)]
    pub vault_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
} 