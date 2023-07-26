import TransportU2f from "@ledgerhq/hw-transport-u2f";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportWebBLE from "@ledgerhq/hw-transport-web-ble";
import LedgerApp from "./ledgerApp";

import Transport from "@ledgerhq/hw-transport";
import platform from "platform";

import { SignableMessage, Transaction } from "@multiversx/sdk-core";
import { LEDGER_TX_GUARDIAN_MIN_VERSION, LEDGER_TX_HASH_SIGN_MIN_VERSION, TRANSACTION_OPTIONS_TX_GUARDED, TRANSACTION_OPTIONS_TX_HASH_SIGN, TRANSACTION_VERSION_WITH_OPTIONS } from "./constants";
import { ErrNotInitialized } from "./errors";
import { IHWWalletApp } from "./interface";
import { compareVersions } from "./versioning";

export class HWProvider {
    private _addressIndex: number = 0;

    constructor(
        private _hwApp?: IHWWalletApp
    ) {}

    public get addressIndex(): number {
        return this._addressIndex;
    }

    public get hwApp(): IHWWalletApp | undefined {
        return this._hwApp;
    }

    /**
     * Creates transport and initialises ledger app.
     */
    async init(): Promise<boolean> {
        try {
            const transport = await this.getTransport();
            this._hwApp = new LedgerApp(transport);

            return true;
        } catch (error) {
            console.error("Provider initialization error", error);
            return false;
        }
    }

    async getTransport(): Promise<Transport> {
        const isLedgerSupported = await this.isLedgerTransportSupported();

        if (!isLedgerSupported) {
            throw Error('Ledger is not supported');
        }

        const webBLESupported = await this.isBLESupported();

        if (webBLESupported) {
            return await TransportWebBLE.create();
        }

        const webUSBSupported = await this.isWebUSBSupported();

        if (webUSBSupported) {
            return await TransportWebUSB.create();
        }

        const webHIDSupported = await this.isWebUSBSupported();

        if (webHIDSupported) {
            return await TransportWebHID.create();
        }

        // Deprecated: Use WebHID instead
        // https://developers.ledger.com/docs/transport/choose-the-transport/
        return await TransportU2f.create();
    }

    async isLedgerTransportSupported(): Promise<boolean> {
        return await this.isBLESupported() || await this.isWebUSBSupported() || await this.isWebHIDSupported() || await this.isU2FSupported();

    }

    async isBLESupported(): Promise<boolean> {
        // WebBLE is supported on Android and Desktop
        // but Ledger does not support pairing with desktop devices yet
        // https://support.ledger.com/hc/en-us/articles/360019138694-Set-up-Bluetooth-connection?docs=true
        return await TransportWebBLE.isSupported() && this.isAndroid();
    }

    isAndroid(): boolean {
        return window.navigator?.userAgent?.toLowerCase().includes('android');
    }

    async isWebUSBSupported(): Promise<boolean> {
        return await TransportWebUSB.isSupported() && platform.name !== "Opera";
    }

    async isWebHIDSupported(): Promise<boolean> {
        return await TransportWebHID.isSupported();
    }

    // U2F is deprecated. Use only BLE, USB, or HID
    async isU2FSupported(): Promise<boolean> {
        return await TransportU2f.isSupported();
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

        this._addressIndex = addressIndex;
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

        const { address } = await this.hwApp.getAddress(0, this._addressIndex);
        return address;
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        transaction = this.cloneTransaction(transaction);

        const appFeatures = await this.getAppFeatures();
        const appVersion = appFeatures.appVersion;
        const mustUseVersionWithOptions = appFeatures.mustUseVersionWithOptions;
        const mustUsingHash = appFeatures.mustSignUsingHash;
        const canUseGuardian = appFeatures.canUseGuardian;

        const inputOptions = transaction.getOptions().valueOf();
        const hasGuardianOption = inputOptions & TRANSACTION_OPTIONS_TX_GUARDED;

        if (hasGuardianOption && !canUseGuardian) {
            throw new Error(`MultiversX App v${appVersion} does not support guarded transactions.`);
        }

        if (mustUseVersionWithOptions) {
            transaction.setVersion(TRANSACTION_VERSION_WITH_OPTIONS);
            console.info("Transaction version: ", transaction.getVersion().valueOf());
        }

        if (mustUsingHash) {
            transaction.setOptions(inputOptions | TRANSACTION_OPTIONS_TX_HASH_SIGN);
            console.info("Transaction options: ", transaction.getOptions().valueOf());
        }

        const serializedTransaction = transaction.serializeForSigning();
        const serializedTransactionBuffer = Buffer.from(serializedTransaction);
        const signature = await this.hwApp.signTransaction(serializedTransactionBuffer, mustUsingHash);
        transaction.applySignature(Buffer.from(signature, "hex"));

        return transaction;
    }

    private cloneTransaction(transaction: Transaction): Transaction {
        return Transaction.fromPlainObject(transaction.toPlainObject());
    }

    async signTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        const signedTransactions = [];

        for (const transaction of transactions) {
            const signedTransaction = await this.signTransaction(transaction);
            signedTransactions.push(signedTransaction);
        }

        return signedTransactions;
    }

    async signMessage(message: SignableMessage): Promise<SignableMessage> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        message = this.cloneMessage(message);

        let serializedMessage = message.serializeForSigningRaw();
        let serializedMessageBuffer = Buffer.from(serializedMessage);
        const signature = await this.hwApp.signMessage(serializedMessageBuffer);
        message.applySignature(Buffer.from(signature, "hex"));

        return message;
    }

    private cloneMessage(message: SignableMessage): SignableMessage {
        return new SignableMessage({
            message: message.message,
            address: message.address,
            signer: message.signer,
            version: message.version,
        });
    }

    async tokenLogin(options: { token: Buffer, addressIndex?: number }): Promise<{ signature: Buffer; address: string }> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        let addressIndex = options.addressIndex || 0;
        await this.setAddressIndex(addressIndex);

        const { signature, address } = await this.hwApp.getAddressAndSignAuthToken(0, addressIndex, options.token);

        return {
            signature: Buffer.from(signature, "hex"),
            address
        };
    }

    private async getAppFeatures(): Promise<{
        appVersion: string;
        mustUseVersionWithOptions: boolean;
        mustSignUsingHash: boolean;
        canUseGuardian: boolean;
    }> {
        if (!this.hwApp) {
            throw new ErrNotInitialized();
        }

        const config = await this.hwApp.getAppConfiguration();
        const appVersion = config.version;
        const mustSignUsingHash = compareVersions(appVersion, LEDGER_TX_HASH_SIGN_MIN_VERSION) >= 0;
        const canUseGuardian = compareVersions(appVersion, LEDGER_TX_GUARDIAN_MIN_VERSION) >= 0;

        return {
            appVersion: appVersion,
            mustUseVersionWithOptions: mustSignUsingHash,
            mustSignUsingHash: mustSignUsingHash,
            canUseGuardian: canUseGuardian
        };
    }
}
