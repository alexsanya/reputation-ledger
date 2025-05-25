use hex;

pub fn check_ed25519_data(data: &[u8]) -> (Vec<u8>, Vec<u8>) {
    // According to this layout used by the Ed25519Program
    // https://github.com/solana-labs/solana-web3.js/blob/master/src/ed25519-program.ts#L33

    // "Deserializing" byte slices


    let data_pubkey                     = &data[16..16+32];  // Bytes 16..16+32
    let data_msg                        = &data[112..];      // Bytes 112..end

    //serrialize data_pubkey into hex string

    //clone data_pubkey and data_msg
    let pubkey_clone = data_pubkey.to_vec();
    let msg_clone = data_msg.to_vec();

    (pubkey_clone, msg_clone)
}