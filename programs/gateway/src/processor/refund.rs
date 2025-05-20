use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::context::Refund;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::RefundEvent;

pub fn process_refund(ctx: Context<Refund>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let authority = order.to_account_info();
    require!(order.status == OrderStatus::Started, ErrorCode::InvalidOrderStatus);
    require!(
        Clock::get()?.unix_timestamp - order.created_at > order.deadline,
        ErrorCode::TimeoutNotReached
    );
    
    // Transfer tokens back to user
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.order_vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority
            }
        ),
        order.price,
    )?;
    
    order.status = OrderStatus::Refunded;
    
    emit!(RefundEvent {
        order: order.key(),
    });
    
    Ok(())
} 