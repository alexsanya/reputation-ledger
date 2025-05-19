use anchor_lang::prelude::*;
use crate::context::Estimate;
use crate::state::{Order, OrderStatus};
use crate::events::OrderPlaced;

pub fn process_estimate(ctx: Context<Estimate>, job_hash: [u8; 32]) -> Result<()> {
    let order = &mut ctx.accounts.order;
    order.user = ctx.accounts.user.key();
    order.job_hash = job_hash;
    order.status = OrderStatus::Placed;
    order.created_at = Clock::get()?.unix_timestamp;
    
    emit!(OrderPlaced {
        user: ctx.accounts.user.key(),
        job_hash,
        order: order.key(),
    });
    
    Ok(())
} 