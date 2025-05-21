use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid order status for this operation")]
    InvalidOrderStatus,
    #[msg("Insufficient funds provided")]
    InsufficientFunds,
    #[msg("Timeout period not reached")]
    TimeoutNotReached,
    #[msg("Invalid user")]
    InvalidUser,
    #[msg("Invalid order vault token account")]
    InvalidOrderVaultTokenAccount,
    #[msg("Invalid vault authority")]
    InvalidVaultAuthority,
} 