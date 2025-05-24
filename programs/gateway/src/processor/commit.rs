use anchor_lang::{prelude::*, solana_program};
use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;
use anchor_spl::token::{self, Transfer};
use crate::context::Commit;
use crate::state::{OrderStatus};
use crate::errors::ErrorCode;
use crate::events::Start;
use crate::utils::parse_ed25519_instruction;

pub fn process_commit(ctx: Context<Commit>, amount: u64) -> Result<()> {
    msg!("Before signature verification syscall");
    let ix = load_instruction_at_checked(0, &ctx.accounts.instructions)?;
    require_keys_eq!(ix.program_id, solana_program::secp256k1_program::id(), ErrorCode::InvalidProgramId);
    msg!("Signature verification syscall");

    let config = &ctx.accounts.config;
    let (pubkey, message, signature) = parse_ed25519_instruction(&ix)?;
    require!(pubkey.as_ref() == config.authority.as_ref(), ErrorCode::InvalidSignature);

    msg!("Pubkey: {:?}", pubkey);

    

    //let order = &mut ctx.accounts.order;
    //require!(order.status == OrderStatus::Evaluated, ErrorCode::InvalidOrderStatus);
    //require!(order.user == ctx.accounts.user.key(), ErrorCode::InvalidUser);
    //require!(amount >= order.price, ErrorCode::InsufficientFunds);
    
    // Transfer tokens to vault
    //token::transfer(
    //    CpiContext::new(
    //        ctx.accounts.token_program.to_account_info(),
    //        Transfer {
    //            from: ctx.accounts.user_token_account.to_account_info(),
    //            to: ctx.accounts.order_vault_token_account.to_account_info(),
    //            authority: ctx.accounts.user.to_account_info(),
    //        }
    //    ),
    //    amount,
    //)?;
    
    //order.status = OrderStatus::Started;
    //order.started_at = Clock::get()?.unix_timestamp;
    //emit!(Start {
    //    order: order.key(),
    //});
    
    Ok(())
} 