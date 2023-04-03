import { assert } from "chai";
import { HWProvider } from "./hwProvider";
import { IAddress, IHWWalletApp, ISignature, ITransaction } from "./interface";

describe("test hwProvider", () => {
    let hwApp: HwAppMock;
    let hwProvider: HWProvider;

    before(async function () {
        hwApp = new HwAppMock();
        hwProvider = new HWProvider();
        hwProvider.hwApp = hwApp;
    });

    it("should shouldSignUsingHash", async () => {
        hwApp.version = "1.0.10";
        assert.isFalse(await (<any>hwProvider).shouldSignUsingHash());

        hwApp.version = "1.0.11";
        assert.isTrue(await (<any>hwProvider).shouldSignUsingHash());

        hwApp.version = "1.1.0";
        assert.isTrue(await (<any>hwProvider).shouldSignUsingHash());
    });

    it("should signTransaction (does not alter version and options)", async () => {
        hwApp.version = "1.0.0";
        hwApp.transactionSignature = "abba";

        const transaction = new TransactionMock();
        transaction.version = 1;
        transaction.options = 0;

        await hwProvider.signTransaction(transaction);

        assert.equal(transaction.signature, "abba");
        assert.equal(transaction.version, 1);
        assert.equal(transaction.options, 0);
    });

    it("should signTransaction (alters version and options)", async () => {
        hwApp.version = "1.1.0";
        hwApp.transactionSignature = "abba";

        const transaction = new TransactionMock();
        transaction.version = 1;
        transaction.options = 0;

        await hwProvider.signTransaction(transaction);

        assert.equal(transaction.signature, "abba");
        assert.equal(transaction.version, 2);
        assert.equal(transaction.options, 1);
    });
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
    serialized = "";
    signature = "";
    signedBy: IAddress | null = null;
    version = 0;
    options = 0;

    serializeForSigning(_signedBy: IAddress): string | Buffer {
        return this.serialized;
    }

    applySignature(signature: ISignature, signedBy: IAddress): void {
        this.signature = signature.hex();
        this.signedBy = signedBy;
    }
}
