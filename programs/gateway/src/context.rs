use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = crate::state::Config::SIZE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, crate::state::Config>,
    pub system_program: Program<'info, System>,
}

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
        space = 500,
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
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"config"],
        has_one = authority,
        bump
    )]
    pub config: Account<'info, crate::state::Config>,
}

#[derive(Accounts)]
pub struct Commit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"vault", order.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = order
    )]
    pub order_vault_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    /// CHECK: This is a PDA that will be used as the token account authority
    //#[account(seeds = [b"vault-authority"], bump)]
    //pub vault_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deliver<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub order: Account<'info, crate::state::Order>,
    #[account(mut)]
    pub order_vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: This is a PDA that will be used as the token account authority
    #[account(seeds = [b"vault-authority"], bump)]
    pub vault_authority: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"config"],
        has_one = authority,
        bump
    )]
    pub config: Account<'info, crate::state::Config>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
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
    pub order_vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"config"],
        has_one = authority,
        bump
    )]
    pub config: Account<'info, crate::state::Config>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is a PDA that will be used as the token account authority
    #[account(seeds = [b"vault-authority"], bump)]
    pub vault_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
} 