use anchor_lang::prelude::*;
use crate::context::Initialize;

pub fn process_initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.user.key();
    config.program_fee_recipient = ctx.accounts.user.key();
    Ok(())
} 