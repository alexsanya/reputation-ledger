use anchor_lang::prelude::*;
use crate::context::Deliver;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::Completed;

pub fn process_deliver(ctx: Context<Deliver>, result_hash: [u8; 32]) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Started, ErrorCode::InvalidOrderStatus);
    
    order.result_hash = result_hash;
    order.status = OrderStatus::Completed;
    
    emit!(Completed {
        order: order.key(),
        result_hash,
    });
    
    Ok(())
} 