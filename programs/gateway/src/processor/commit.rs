use anchor_lang::{prelude::*, solana_program};
use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;
use anchor_spl::token::{self, Transfer};
use crate::context::Commit;
use crate::errors::ErrorCode;
use crate::utils::check_ed25519_data;
use crate::state::OrderStatus;
use crate::events::Start;

pub fn process_commit(ctx: Context<Commit>, job_hash: [u8; 32], amount: u64) -> Result<()> {
    let ix = load_instruction_at_checked(0, &ctx.accounts.instructions)?;
    require_keys_eq!(ix.program_id, solana_program::ed25519_program::id(), ErrorCode::InvalidProgramId);

    let config = &ctx.accounts.config;
    let key =  hex::decode(check_ed25519_data(&ix.data)).unwrap();

    //compare key and config.authority
    require!(key == config.authority.to_bytes(), ErrorCode::InvalidSignature);


    let order = &mut ctx.accounts.order;
    let order_key = order.key();
    msg!("order account: {:?}", order_key);
    order.user = ctx.accounts.user.key();
    order.job_hash = job_hash;
    order.status = OrderStatus::Started;
    order.started_at = Clock::get()?.unix_timestamp;
    order.price = amount;
    order.price_valid_until = u64::try_from(Clock::get()?.unix_timestamp).unwrap() + 1000;
    order.deadline = 1000;

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
    
    emit!(Start {
        order: order.key(),
    });
    
    Ok(())
} 