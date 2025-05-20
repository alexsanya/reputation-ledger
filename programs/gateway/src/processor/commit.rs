use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::context::Commit;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::Start;

pub fn process_commit(ctx: Context<Commit>, amount: u64) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Evaluated, ErrorCode::InvalidOrderStatus);
    require!(order.user == ctx.accounts.user.key(), ErrorCode::InvalidUser);
    require!(amount >= order.price, ErrorCode::InsufficientFunds);
    
    // Transfer tokens to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.order_vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }
        ),
        amount,
    )?;
    
    order.status = OrderStatus::Started;
    order.started_at = Clock::get()?.unix_timestamp;
    emit!(Start {
        order: order.key(),
    });
    
    Ok(())
} 