use anchor_lang::{prelude::*, solana_program};
use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;
use anchor_spl::token::{self, Transfer};
use borsh::BorshDeserialize;
use crate::context::Commit;
use crate::errors::ErrorCode;
use crate::utils::check_ed25519_data;
use crate::state::OrderStatus;
use crate::events::Start;

#[derive(Debug, BorshDeserialize)]
pub struct Order {
    pub user: [u8; 32],
    pub job_hash: [u8; 32],
    pub price: u64,
    pub mint: Pubkey,
    pub price_valid_until: u64,
    pub deadline: i64,
}

pub fn process_commit(ctx: Context<Commit>, job_hash: [u8; 32]) -> Result<()> {
    let ix = load_instruction_at_checked(0, &ctx.accounts.instructions)?;
    require_keys_eq!(ix.program_id, solana_program::ed25519_program::id(), ErrorCode::InvalidProgramId);

    let config = &ctx.accounts.config;
    let (key, message) =  check_ed25519_data(&ix.data);


    let order_decoded = Order::try_from_slice(&message)?;

    //compare key and config.authority
    require_keys_eq!(
        ctx.accounts.user_token_account.owner,
        ctx.accounts.user.key(),
        ErrorCode::InvalidTokenAccountOwner
    );
    require!(key == config.authority_signer.to_bytes(), ErrorCode::InvalidSignature);
    require!(order_decoded.job_hash == job_hash, ErrorCode::InvalidJobHash);
    require!(order_decoded.price_valid_until > Clock::get()?.unix_timestamp as u64, ErrorCode::OfferExpired);
    require_keys_eq!(order_decoded.mint, ctx.accounts.mint.key(), ErrorCode::InvalidMint);

    let order = &mut ctx.accounts.order;
    order.user = ctx.accounts.user.key();
    order.job_hash = job_hash;
    order.status = OrderStatus::Started;
    order.started_at = Clock::get()?.unix_timestamp;
    order.price = order_decoded.price;
    order.price_valid_until = order_decoded.price_valid_until;
    order.deadline = order_decoded.deadline;

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
        order_decoded.price
    )?;
    
    emit!(Start {
        order: order.key(),
    });
    
    Ok(())
} 