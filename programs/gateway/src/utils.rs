use hex;

pub fn check_ed25519_data(data: &[u8]) -> (String, String) {
    // According to this layout used by the Ed25519Program
    // https://github.com/solana-labs/solana-web3.js/blob/master/src/ed25519-program.ts#L33

    // "Deserializing" byte slices


    let data_pubkey                     = &data[16..16+32];  // Bytes 16..16+32
    let data_msg                        = &data[112..];      // Bytes 112..end

    //serrialize data_pubkey into hex string
    let pubkey_hex = hex::encode(data_pubkey);
    let data_msg_hex = hex::encode(data_msg);

    (pubkey_hex, data_msg_hex)
}