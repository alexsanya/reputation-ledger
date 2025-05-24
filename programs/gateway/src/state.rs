use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Started,
    Completed,
    Aborted,
    Refunded,
}

#[account]
pub struct Order {
    pub user: Pubkey,
    pub job_hash: [u8; 32],
    pub result_hash: [u8; 32],
    pub price: u64,
    pub price_valid_until: u64,
    pub deadline: i64,
    pub status: OrderStatus,
    pub started_at: i64,
    pub completed_at: i64,
}

impl Order {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 8 + 8 + 8;
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub program_fee_recipient: Pubkey,
}

impl Config {
    pub const SIZE: usize = 8 + 32 + 32;
}

