export interface IHWProvider {
    init(): Promise<boolean>;
    login(options?: {callbackUrl?: string; token?: string; addressIndex?: number}): Promise<string>;
    logout(options?: {callbackUrl?: string}): Promise<boolean>;
    getAddress(): Promise<string>;
    isInitialized(): boolean;
    isConnected(): Promise<boolean>;
    signTransaction(transaction: ITransaction, options?: {callbackUrl?: string}): Promise<ITransaction>;
    signTransactions(transaction: Array<ITransaction>, options?: {callbackUrl?: string}): Promise<Array<ITransaction>>;
    signMessage(transaction: ISignableMessage, options?: {callbackUrl?: string}): Promise<ISignableMessage>;

    getAccounts(startIndex: number, length: number): Promise<string[]>;
    tokenLogin(options: { token: Buffer, addressIndex?: number }): Promise<{signature: ISignature; address: string}>;
}

export interface IHWElrondApp {
    getAddress(
        account: number,
        index: number,
        display?: boolean
    ): Promise<{
        publicKey: string;
        address: string;
        chainCode?: string;
    }>;
    setAddress(
        account: number,
        index: number,
        display?: boolean,
    ): Promise<any>;
    signTransaction(rawTx: Buffer, usingHash: boolean): Promise<string>;
    signMessage(rawMessage: Buffer): Promise<string>;
    getAppConfiguration(): Promise<{
        version: string;
        contractData: number;
        accountIndex: number;
        addressIndex: number;
    }>;
    getAddressAndSignAuthToken(
      account: number,
      index: number,
      token: Buffer,
    ): Promise<{
        address: string,
        signature: string,
    }>;
}

export interface ISignature {
    hex(): string;
}

export interface IAddress {
    bech32(): string;
}

export interface ITransaction {
    version: ITransactionVersion;
    options: ITransactionOptions;
    
    serializeForSigning(signedBy: IAddress): Buffer | string;
    applySignature(signature: ISignature, signedBy: IAddress): void;
}

export interface ISignableMessage {
    serializeForSigningRaw(): Buffer | string;
    applySignature(signature: ISignature): void;
}

export interface ITransactionVersion {
    valueOf(): number;
}

export interface ITransactionOptions {
    valueOf(): number;
}
