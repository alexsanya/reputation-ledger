use anchor_lang::prelude::*;

#[event]
pub struct OrderPlaced {
    pub user: Pubkey,
    pub job_hash: [u8; 32],
    pub order: Pubkey,
}

#[event]
pub struct EvaluationMade {
    pub order: Pubkey,
    pub price: u64,
}

#[event]
pub struct Start {
    pub order: Pubkey,
}

#[event]
pub struct Completed {
    pub order: Pubkey,
    pub result_hash: [u8; 32],
}

#[event]
pub struct Abort {
    pub order: Pubkey,
}

#[event]
pub struct RefundEvent {
    pub order: Pubkey,
} 