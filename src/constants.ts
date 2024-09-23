// Since this version, the MultiversX Ledger App only supports signing a hash of the transaction - tx.options = 0b0001.
export const LEDGER_TX_HASH_SIGN_MIN_VERSION = "1.0.11";

// Since this version, the MultiversX Ledger App supports guarded transactions - tx.options = 0b00(0|1)1.
export const LEDGER_TX_GUARDIAN_MIN_VERSION = "1.0.22";

export const TRANSACTION_VERSION_WITH_OPTIONS = 2;
export const TRANSACTION_OPTIONS_TX_HASH_SIGN = 0b0001;
export const TRANSACTION_OPTIONS_TX_GUARDED = 0b0010;

export const SIGNER = 'ledger';