use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::context::Deliver;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::Completed;

pub fn process_deliver(ctx: Context<Deliver>, result_hash: [u8; 32]) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let authority = order.to_account_info();
    require!(order.status == OrderStatus::Started, ErrorCode::InvalidOrderStatus);
    
    order.result_hash = result_hash;
    order.status = OrderStatus::Completed;
    order.completed_at = Clock::get()?.unix_timestamp;

    // transfer all tokens from order_vault_token_account to vault_token_account
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {  
                from: ctx.accounts.order_vault_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority
            }
        ),
        order.price,
    )?;
    
    emit!(Completed {
        order: order.key(),
        result_hash,
    });
    
    Ok(())
} 