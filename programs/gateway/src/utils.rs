use anchor_lang::{prelude::*, solana_program::instruction::Instruction};
use arrayref::array_ref;

use crate::errors::ErrorCode;

pub fn parse_ed25519_instruction(
    ix: &Instruction,
) -> Result<(&[u8; 32], &[u8], &[u8; 64])> {
    // Format of ed25519 instruction data:
    // [sig_count (u8), padding (u8), offset_data]
    // Then a list of [signature_offset, pubkey_offset, message_offset, message_len] (each u16)
    // Then raw data blob containing: signature (64), pubkey (32), message (variable)

    let data = &ix.data;

    // Get signature count
    let sig_count = data[0] as usize;

    if sig_count == 0 {
        return Err(ErrorCode::InvalidInstructionData.into());
    }

    // Offset section starts at byte 2
    let offsets_start = 2;
    let sig_offset = u16::from_le_bytes([data[offsets_start], data[offsets_start + 1]]) as usize;
    let pubkey_offset = u16::from_le_bytes([data[offsets_start + 2], data[offsets_start + 3]]) as usize;
    let msg_offset = u16::from_le_bytes([data[offsets_start + 4], data[offsets_start + 5]]) as usize;
    let msg_len = u16::from_le_bytes([data[offsets_start + 6], data[offsets_start + 7]]) as usize;

    // Data payload begins at offset: 2 + (sig_count * 14)
    let data_start = offsets_start + (sig_count * 14);

    let sig = array_ref![data, data_start + sig_offset, 64];
    let pubkey = array_ref![data, data_start + pubkey_offset, 32];
    let message = &data[data_start + msg_offset..data_start + msg_offset + msg_len];

    Ok((pubkey, message, sig))
}

