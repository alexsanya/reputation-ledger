use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::context::Decline;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::Abort;

pub fn process_decline(ctx: Context<Decline>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Started, ErrorCode::InvalidOrderStatus);
    
    // Transfer tokens back to user
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            }
        ),
        order.price,
    )?;
    
    order.status = OrderStatus::Aborted;
    order.completed_at = Clock::get()?.unix_timestamp;
    
    emit!(Abort {
        order: order.key(),
    });
    
    Ok(())
} 