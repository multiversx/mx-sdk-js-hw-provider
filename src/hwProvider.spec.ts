import { assert } from "chai";
import { HWProvider } from "./hwProvider";
import { IAddress, IHWWalletApp, ITransaction, ITransactionOptions, ITransactionVersion } from "./interface";

describe("test hwProvider", () => {
    let hwApp: HwAppMock;
    let hwProvider: HWProvider;

    before(async function () {
        hwApp = new HwAppMock();
        hwProvider = new HWProvider();
        hwProvider.hwApp = hwApp;
    });

    it("should getAppFeatures", async () => {
        hwApp.version = "1.0.10";
        assert.isFalse((await (<any>hwProvider).getAppFeatures()).mustSignUsingHash);
        assert.isFalse((await (<any>hwProvider).getAppFeatures()).canUseGuardian);

        hwApp.version = "1.0.11";
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).mustSignUsingHash);
        assert.isFalse((await (<any>hwProvider).getAppFeatures()).canUseGuardian);

        hwApp.version = "1.0.21";
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).mustSignUsingHash);
        assert.isFalse((await (<any>hwProvider).getAppFeatures()).canUseGuardian);

        hwApp.version = "1.0.22";
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).mustSignUsingHash);
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).canUseGuardian);

        hwApp.version = "1.1.0";
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).mustSignUsingHash);
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).canUseGuardian);

        hwApp.version = "1.1.0";
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).mustSignUsingHash);
        assert.isTrue((await (<any>hwProvider).getAppFeatures()).canUseGuardian);
    });

    it("should signTransaction", async () => {
        await testSignTransaction({
            deviceVersion: "1.0.10",
            transactionSignature: "abba",
            transactionVersion: 1,
            transactionOptions: 0,
            expectedTransactionVersion: 1,
            expectedTransactionOptions: 0
        });

        await testSignTransaction({
            deviceVersion: "1.0.11",
            transactionSignature: "abba",
            transactionVersion: 1,
            transactionOptions: 0,
            expectedTransactionVersion: 2,
            expectedTransactionOptions: 1
        });

        await testSignTransaction({
            deviceVersion: "1.0.11",
            transactionSignature: "abba",
            transactionVersion: 2,
            transactionOptions: 1,
            expectedTransactionVersion: 2,
            expectedTransactionOptions: 1
        });

        try {
            await testSignTransaction({
                deviceVersion: "1.0.21",
                transactionSignature: "abba",
                transactionVersion: 2,
                transactionOptions: 0b1110,
                expectedTransactionVersion: 2,
                expectedTransactionOptions: 0b1111
            });

            assert.fail("Should have thrown");
        } catch (err) {
            assert.equal(err.message, "MultiversX App v1.0.21 does not support guarded transactions.");
        }

        await testSignTransaction({
            deviceVersion: "1.0.22",
            transactionSignature: "abba",
            transactionVersion: 2,
            transactionOptions: 0b1110,
            expectedTransactionVersion: 2,
            expectedTransactionOptions: 0b1111
        });
    });

    async function testSignTransaction(options: {
        deviceVersion: string,
        transactionSignature: string,
        transactionVersion: number,
        transactionOptions: number,
        expectedTransactionVersion: number,
        expectedTransactionOptions: number
    }) {
        hwApp.version = options.deviceVersion;
        hwApp.transactionSignature = options.transactionSignature;

        const transaction = new TransactionMock();
        transaction.version = options.transactionVersion;
        transaction.options = options.transactionOptions;

        await hwProvider.signTransaction(transaction);

        assert.equal(transaction.signature.toString("hex"), options.transactionSignature);
        assert.equal(transaction.version, options.expectedTransactionVersion);
        assert.equal(transaction.options, options.expectedTransactionOptions);
    }
});

class HwAppMock implements IHWWalletApp {
    version = "";
    contractData = 1;
    accountIndex = 0;
    addressIndex = 0;
    address = "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th";
    transactionSignature = "";
    messageSignature = "";
    authTokenSignature = "";

    async getAddress() {
        return { address: this.address };
    }

    async setAddress() {
        return { address: this.address };
    }

    async signTransaction(_rawTx: Buffer, _usingHash: boolean) {
        return this.transactionSignature;
    }

    async signMessage(_rawMessage: Buffer) {
        return this.messageSignature;
    }

    async getAppConfiguration() {
        return {
            version: this.version,
            contractData: this.contractData,
            accountIndex: this.accountIndex,
            addressIndex: this.addressIndex
        };
    }

    async getAddressAndSignAuthToken(_account: number, _index: number, _token: Buffer) {
        return {
            address: this.address,
            signature: this.authTokenSignature
        }
    }
}

class TransactionMock implements ITransaction {
    serialized: Buffer = Buffer.from([]);
    signature: Buffer = Buffer.from([]);
    signedBy: IAddress | null = null;
    version: ITransactionVersion = 0;
    options: ITransactionOptions = 0;

    getVersion(): ITransactionVersion {
        return this.version;
    }

    setVersion(version: ITransactionVersion): void {
        this.version = version;
    }

    getOptions(): ITransactionOptions {
        return this.options;
    }

    setOptions(options: ITransactionOptions): void {
        this.options = options;
    }

    serializeForSigning(): Buffer {
        return this.serialized;
    }

    applySignature(signature: Buffer): void {
        this.signature = signature;
    }
}
