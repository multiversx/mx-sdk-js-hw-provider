import Transport from "@ledgerhq/hw-transport";
import TransportWebBLE from "@ledgerhq/hw-transport-web-ble";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

import { SignableMessage, Transaction } from "@multiversx/sdk-core";
import {
    LEDGER_TX_GUARDIAN_MIN_VERSION,
    LEDGER_TX_HASH_SIGN_MIN_VERSION,
    TRANSACTION_OPTIONS_TX_GUARDED,
    TRANSACTION_OPTIONS_TX_HASH_SIGN,
    TRANSACTION_VERSION_WITH_OPTIONS
} from "./constants";
import { ErrNotInitialized } from "./errors";
import { IHWWalletApp } from "./interface";
import LedgerApp from "./ledgerApp";
import { TransportType } from "./transport-type.enum";
import { compareVersions } from "./versioning";

export class HWProvider {
    private _addressIndex = 0;
    private _transport: Transport | undefined;
    private _transportType: TransportType | undefined;

    constructor(
        private _hwApp?: IHWWalletApp
    ) {
    }

    public get addressIndex(): number {
        return this._addressIndex;
    }

    public get hwApp(): IHWWalletApp | undefined {
        return this._hwApp;
    }

    public get transportType(): TransportType | undefined {
        return this._transportType;
    }

    /**
     * Creates transport and initialises ledger app.
     */
    async init(type?: TransportType): Promise<boolean> {
        if (this.isInitialized()) {
            return true;
        }

        try {
            const { transport, transportType } = await this.getTransport(type);
            this._transportType = transportType;
            this._transport = transport;
            this._hwApp = new LedgerApp(this._transport);

            return this.isInitialized();
        } catch (error) {
            console.error("Provider initialization error", error);
            return false;
        }
    }

    async getTransport(type?: TransportType): Promise<{ transport: Transport; transportType: TransportType }> {
        if (this._transport && this._transportType) {
            return {
                transport: this._transport,
                transportType: this._transportType
            };
        }

        const isLedgerSupported = await this.isLedgerTransportSupported();

        if (!isLedgerSupported) {
            throw Error("Ledger is not supported");
        }

        if (type) {
            const transport = await this.getTransportByType(type);

            if (!transport) {
                throw Error(`Failed to initialize provider type ${type}`);
            }

            return transport;
        }

        let transport = await this.getUSBTransport();

        if (transport) {
            return transport;
        }

        transport = await this.getBLETransport();

        if (transport) {
            return transport;
        }

        transport = await this.getHIDTransport();

        if (transport) {
            return transport;
        }

        throw Error("Failed to initialize provider");
    }

    async getTransportByType(type: TransportType): Promise<{ transport: Transport; transportType: TransportType } | null> {
        switch (type) {
            case TransportType.USB:
                return this.getUSBTransport();
            case TransportType.BLE:
                return this.getBLETransport();
            case TransportType.HID:
                return this.getHIDTransport();
            default:
                throw Error("Transport type not supported");
        }
    }

    async getUSBTransport(): Promise<{ transport: Transport; transportType: TransportType } | null> {
        try {
            const webUSBSupported = await this.isWebUSBSupported();

            if (webUSBSupported) {
                console.log("Web USB Transport selected");
                const transport = await TransportWebUSB.create();

                return {
                    transport,
                    transportType: TransportType.USB
                };
            }
        } catch (error) {
            console.error("Failed to create USB transport:", error);
        }

        return null;
    }

    async getBLETransport(): Promise<{ transport: Transport; transportType: TransportType } | null> {
        try {
            const webBLESupported = await this.isBLESupported();

            if (webBLESupported) {
                console.log("Web BLE Transport selected");
                const transport = await TransportWebBLE.create();

                return {
                    transport,
                    transportType: TransportType.BLE
                };
            }
        } catch (error) {
            console.error("Failed to create BLE transport:", error);
        }

        return null;
    }

    async getHIDTransport(): Promise<{ transport: Transport; transportType: TransportType } | null> {
        try {
            const webHIDSupported = await this.isWebHIDSupported();

            if (webHIDSupported) {
                console.log("Web HID Transport selected");
                const transport = await TransportWebHID.create();

                return {
                    transport,
                    transportType: TransportType.HID
                };
            }
        } catch (error) {
            console.error("Failed to create HID transport:", error);
        }

        return null;
    }

    async isLedgerTransportSupported(): Promise<boolean> {
        return await this.isBLESupported() || await this.isWebUSBSupported() || await this.isWebHIDSupported();

    }

    async isBLESupported(): Promise<boolean> {
        return await TransportWebBLE.isSupported();
    }

    async isWebUSBSupported(): Promise<boolean> {
        return await TransportWebUSB.isSupported();
    }

    async isWebHIDSupported(): Promise<boolean> {
        return await TransportWebHID.isSupported();
    }

    /**
     * Returns true if init() was previously called successfully
     */
    isInitialized(): boolean {
        return Boolean(this.hwApp && this._transport && this._transportType);
    }

    /**
     * Mocked function, returns isInitialized as an async function
     */
    isConnected(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.isInitialized()) {
                return resolve(false);
            }

            if (this._transportType === TransportType.USB) {
                return resolve((this._transport as TransportWebUSB).device.opened);
            }

            if (this._transportType === TransportType.BLE) {
                return resolve((this._transport as TransportWebBLE).device.gatt.connected);
            }

            return resolve(true);
        });
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
            version: message.version
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
