use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Transfer};
use crate::context::Decline;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::Abort;

pub fn process_decline(ctx: Context<Decline>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Started, ErrorCode::InvalidOrderStatus);

    let (order_account, order_bump) = Pubkey::find_program_address(
        &[b"order", order.user.as_ref(), order.job_hash.as_ref()],
        ctx.program_id
    );
    require!(order_account == order.key(), ErrorCode::InvalidOrderAccount);
    require_keys_eq!(
        ctx.accounts.order_vault_token_account.owner,
        order.key(),
        ErrorCode::InvalidOrderVaultTokenAccountOwner
    );
    
    // Transfer tokens back to user
    let vault_authority_seeds = &[
        b"order",
        order.user.as_ref(),
        order.job_hash.as_ref(), // assuming this is how `order` PDA was created
        &[order_bump],
    ];
    // transfer all tokens from order_vault_token_account to vault_token_account
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {  
                from: ctx.accounts.order_vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: order.to_account_info(),
            },
            &[vault_authority_seeds]
        ),
        order.price,
    )?;

    // remove vault token account
    // 2️⃣ Close order_vault token account and send rent lamports to the recipient
    token::close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.order_vault_token_account.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: order.to_account_info(),
            },
            &[vault_authority_seeds]
        ),
    )?;

    order.status = OrderStatus::Aborted;
    order.completed_at = Clock::get()?.unix_timestamp;

    emit!(Abort {
        order: order.key(),
    });
    
    Ok(())
} 