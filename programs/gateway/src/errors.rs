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
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid token account owner")]
    InvalidTokenAccountOwner,
    #[msg("Offer expired")]
    OfferExpired,
    #[msg("Invalid order vault token account owner")]
    InvalidOrderVaultTokenAccountOwner,
    #[msg("Invalid order account")]
    InvalidOrderAccount,
    #[msg("Deliver after deadline")]
    DeliverAfterDeadline,
    #[msg("Refund before deadline")]
    RefundBeforeDeadline,
} 