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
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Invalid instruction data")]
    InvalidInstructionData,
    #[msg("Invalid program id")]
    InvalidProgramId,
    #[msg("Invalid signature data")]
    SigVerificationFailed,
    #[msg("Invalid job hash")]
    InvalidJobHash,
} 