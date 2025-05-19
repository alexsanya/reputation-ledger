use anchor_lang::prelude::*;
use crate::context::Evaluate;
use crate::state::{Order, OrderStatus};
use crate::errors::ErrorCode;
use crate::events::EvaluationMade;

pub fn process_evaluate(ctx: Context<Evaluate>, price: u64) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Placed, ErrorCode::InvalidOrderStatus);
    
    order.price = price;
    order.status = OrderStatus::Evaluated;
    
    emit!(EvaluationMade {
        order: order.key(),
        price,
    });
    
    Ok(())
} 