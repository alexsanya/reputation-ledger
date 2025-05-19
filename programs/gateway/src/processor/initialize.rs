use anchor_lang::prelude::*;
use crate::context::Initialize;

pub fn process_initialize(_ctx: Context<Initialize>) -> Result<()> {
    msg!("Greetings from: {:?}", _ctx.program_id);
    Ok(())
} 