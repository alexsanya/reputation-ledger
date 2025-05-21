use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::context::Withdraw;
use crate::errors::ErrorCode;

pub fn process_withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let vault_account = &ctx.accounts.vault_token_account;
    let amount = vault_account.amount;
    
    if amount == 0 {
        return Err(ErrorCode::InsufficientFunds.into());
    }

    // get vault_authority_bump using find_program_address
    let (vault_authority, vault_authority_bump) = Pubkey::find_program_address(
        &[b"vault-authority"],
        ctx.program_id
    );

    require!(vault_authority == ctx.accounts.vault_authority.key(), ErrorCode::InvalidVaultAuthority);

    // Transfer all tokens from vault to recipient
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            &[&[
                b"vault-authority",
                &[vault_authority_bump],
            ]],
        ),
        amount,
    )?;
    
    Ok(())
}
