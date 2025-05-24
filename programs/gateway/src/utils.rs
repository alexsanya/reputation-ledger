use anchor_lang::{prelude::*, solana_program::instruction::Instruction};
use arrayref::array_ref;
use hex;

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

pub fn check_ed25519_data(data: &[u8]) -> String {
    // According to this layout used by the Ed25519Program
    // https://github.com/solana-labs/solana-web3.js/blob/master/src/ed25519-program.ts#L33

    // "Deserializing" byte slices

    let num_signatures                  = &[data[0]];        // Byte  0
    let padding                         = &[data[1]];        // Byte  1
    let signature_offset                = &data[2..=3];      // Bytes 2,3
    let signature_instruction_index     = &data[4..=5];      // Bytes 4,5
    let public_key_offset               = &data[6..=7];      // Bytes 6,7
    let public_key_instruction_index    = &data[8..=9];      // Bytes 8,9
    let message_data_offset             = &data[10..=11];    // Bytes 10,11
    let message_data_size               = &data[12..=13];    // Bytes 12,13
    let message_instruction_index       = &data[14..=15];    // Bytes 14,15

    let data_pubkey                     = &data[16..16+32];  // Bytes 16..16+32
    let data_sig                        = &data[48..48+64];  // Bytes 48..48+64
    let data_msg                        = &data[112..];      // Bytes 112..end

    // Expected values

    let exp_public_key_offset:      u16 = 16; // 2*u8 + 7*u16

    msg!("data_pubkey: {:?}", data_pubkey);

    //serrialize data_pubkey into hex string
    let pubkey_hex = hex::encode(data_pubkey);

    pubkey_hex
}