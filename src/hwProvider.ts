import TransportU2f from "@ledgerhq/hw-transport-u2f";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApp from "./ledgerApp";

import Transport from "@ledgerhq/hw-transport";
import platform from "platform";

import { LEDGER_TX_HASH_SIGN_MIN_VERSION, TRANSACTION_OPTIONS_TX_HASH_SIGN, TRANSACTION_VERSION_WITH_OPTIONS } from "./constants";
import { ErrNotInitialized } from "./errors";
import { IHWWalletApp, ISignableMessage, ISignature, ITransaction } from "./interface";
import { Signature } from "./signature";
import { UserAddress } from "./userAddress";
import { compareVersions } from "./versioning";

export class HWProvider {
    hwApp?: IHWWalletApp;
    addressIndex: number = 0;

    constructor() {
    }

    /**
     * Creates transport and initialises ledger app.
     */
    async init(): Promise<boolean> {
        try {
            const transport = await this.getTransport();
            this.hwApp = new LedgerApp(transport);

            return true;
        } catch (error) {
            return false;
        }
    }

    async getTransport(): Promise<Transport> {
        let webUSBSupported = await TransportWebUSB.isSupported();
        webUSBSupported =
            webUSBSupported &&
            platform.name !== "Opera";

        if (webUSBSupported) {
            return await TransportWebUSB.create();
        }

        let webHIDSupported = await TransportWebHID.isSupported();
        if (webHIDSupported) {
            return await TransportWebHID.open("");
        }

        return await TransportU2f.create();
    }

    /**
     * Returns true if init() was previously called successfully
     */
    isInitialized(): boolean {
        return !!this.hwApp;
    }

    /**
     * Mocked function, returns isInitialized as an async function
     */
    isConnected(): Promise<boolean> {
        return new Promise((resolve, _) => resolve(this.isInitialized()));
    }

    /**
     * Performs a login request by setting the selected index in Ledger and returning that address
     */
    async login(options: { addressIndex: number } = { addressIndex: 0 }): Promise<string> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        await this.setAddressIndex(options.addressIndex);
        const { address } = await this.hwApp.getAddress(0, options.addressIndex, true);
        return address;
    }

    async setAddressIndex(addressIndex: number): Promise<void> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        this.addressIndex = addressIndex;
        await this.hwApp.setAddress(0, addressIndex);
    }

    async getAccounts(page: number = 0, pageSize: number = 10): Promise<string[]> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }
        const addresses = [];

        const startIndex = page * pageSize;
        for (let index = startIndex; index < startIndex + pageSize; index++) {
            const { address } = await this.hwApp.getAddress(0, index);
            addresses.push(address);
        }
        return addresses;
    }

    /**
     * Mocks a logout request by returning true
     */
    async logout(): Promise<boolean> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        return true;
    }

    /**
     * Fetches current selected ledger address
     */
    async getAddress(): Promise<string> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        const { address } = await this.hwApp.getAddress(0, this.addressIndex);
        return address;
    }

    async signTransaction<T extends ITransaction>(transaction: T): Promise<T> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        const currentAddressBech32 = await this.getAddress();
        const currentAddress = new UserAddress(currentAddressBech32);

        const signUsingHash = await this.shouldSignUsingHash();
        if (signUsingHash) {
            transaction.setVersion(TRANSACTION_VERSION_WITH_OPTIONS);
            transaction.setOptions(transaction.getOptions().valueOf() | TRANSACTION_OPTIONS_TX_HASH_SIGN);

            console.info("Signing transaction using hash.");
            console.info("Transaction version: ", transaction.getVersion().valueOf());
            console.info("Transaction options: ", transaction.getOptions().valueOf());
        }

        const serializedTransaction = transaction.serializeForSigning(currentAddress);
        const serializedTransactionBuffer = Buffer.from(serializedTransaction);
        const signature = await this.hwApp.signTransaction(serializedTransactionBuffer, signUsingHash);
        transaction.applySignature(Signature.fromHex(signature), currentAddress);

        return transaction;
    }

    async signTransactions<T extends ITransaction>(transactions: T[]): Promise<T[]> {
        for (const tx of transactions) {
            await this.signTransaction(tx);
        }

        return transactions;
    }

    async signMessage<T extends ISignableMessage>(message: T): Promise<T> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        let serializedMessage = message.serializeForSigningRaw();
        let serializedMessageBuffer = Buffer.from(serializedMessage);
        const signature = await this.hwApp.signMessage(serializedMessageBuffer);
        message.applySignature(Signature.fromHex(signature));

        return message;
    }

    async tokenLogin(options: { token: Buffer, addressIndex?: number }): Promise<{ signature: ISignature; address: string }> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        let addressIndex = options.addressIndex || 0;
        await this.setAddressIndex(addressIndex);

        const { signature, address } = await this.hwApp.getAddressAndSignAuthToken(0, addressIndex, options.token);

        return {
            signature: Signature.fromHex(signature),
            address
        };
    }

    private async shouldSignUsingHash(): Promise<boolean> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        const config = await this.hwApp.getAppConfiguration();

        let diff = compareVersions(config.version, LEDGER_TX_HASH_SIGN_MIN_VERSION);
        return diff >= 0;
    }
}
