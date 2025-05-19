use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::context::FundMe;

pub fn process_fund_me(ctx: Context<FundMe>, amount: u64) -> Result<()> {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),    
                authority: ctx.accounts.user.to_account_info(),
            }
        ),
        amount,
    )?;

    Ok(())
} 