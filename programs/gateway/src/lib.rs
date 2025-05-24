use anchor_lang::prelude::*;
declare_id!("9gtZkEkTdYCHTDFc3fZoMDW6wCVkWhdcxCESQ7z98Ptf");

pub mod state;
pub mod context;
pub mod errors;
pub mod processor;
pub mod events;
pub mod utils;

use crate::context::*;
#[program]
pub mod gateway {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        processor::initialize::process_initialize(ctx)
    }

    pub fn fund_me(ctx: Context<FundMe>, amount: u64) -> Result<()> {
        processor::fund_me::process_fund_me(ctx, amount)
    }

    pub fn commit(ctx: Context<Commit>, job_hash: [u8; 32], amount: u64) -> Result<()> {
        processor::commit::process_commit(ctx, job_hash, amount)
    }

    pub fn deliver(ctx: Context<Deliver>, result_hash: [u8; 32]) -> Result<()> {
        processor::deliver::process_deliver(ctx, result_hash)
    }

    pub fn decline(ctx: Context<Decline>) -> Result<()> {
        processor::decline::process_decline(ctx)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        processor::refund::process_refund(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        processor::withdraw::process_withdraw(ctx)
    }
}