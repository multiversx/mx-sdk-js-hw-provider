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
