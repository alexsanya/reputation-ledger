use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Placed,
    Evaluated,
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
    pub status: OrderStatus,
    pub created_at: i64,
}
