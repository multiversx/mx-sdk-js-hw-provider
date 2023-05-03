export interface IHWWalletApp {
    getAddress(
        account: number,
        index: number,
        display?: boolean
    ): Promise<{
        address: string;
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

export interface IAddress {
    bech32(): string;
}

export interface ITransaction {
    getVersion(): ITransactionVersion;
    setVersion(version: ITransactionVersion): void;
    getOptions(): ITransactionOptions;
    setOptions(options: ITransactionOptions): void;
    serializeForSigning(): Buffer;
    applySignature(signature: Buffer): void;
}

export interface ISignableMessage {
    serializeForSigningRaw(): Buffer;
    applySignature(signature: Buffer): void;
}

export interface ITransactionVersion {
    valueOf(): number;
}

export interface ITransactionOptions {
    valueOf(): number;
}
