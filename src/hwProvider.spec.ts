import {
    Address,
    Message,
    MessageComputer,
    Transaction
} from "@multiversx/sdk-core";
import { assert } from "chai";
import { HWProvider } from "./hwProvider";
import { IHWWalletApp } from "./interface";

describe("test hwProvider", () => {
    let hwApp: HwAppMock;
    let hwProvider: HWProvider;

    before(async function () {
        hwApp = new HwAppMock();
        hwProvider = new HWProvider(hwApp);
    });

    it("should not support ledger when navigator is empty", async () => {
        Object.assign(global, {
            window: {
                navigator: {}
            },
            navigator: {}
        });

        const isSupported = await hwProvider.isLedgerTransportSupported();
        assert.isFalse(isSupported);
    });

    it("should throw error when ledger is not supported", async () => {
        Object.assign(global, {
            window: {
                navigator: {}
            },
            navigator: {}
        });

        try {
            await hwProvider.getTransport();
            assert.fail("Ledger is not supported");
        } catch (e) {
            assert.equal(e.message, "Ledger is not supported");
        }
    });

    it("should support Bluetooth API", async () => {
        Object.assign(global, {
            window: {
                navigator: {
                    bluetooth: {}
                }
            },
            navigator: {
                bluetooth: {}
            }
        });

        const isSupported = await hwProvider.isLedgerTransportSupported();

        assert.isTrue(isSupported);
    });

    it("should support USB API", async () => {
        Object.assign(global, {
            window: {
                navigator: {
                    usb: {
                        getDevices: () => true
                    },
                    platform: {
                        name: ""
                    }
                }
            },
            navigator: {
                usb: {
                    getDevices: () => true
                },
                platform: {
                    name: ""
                }
            }
        });

        const isSupported = await hwProvider.isLedgerTransportSupported();
        assert.isTrue(isSupported);
    });

    it("should support HID", async () => {
        Object.assign(global, {
            window: {
                navigator: {
                    hid: {}
                }
            },
            navigator: {
                hid: {}
            }
        });

        const isSupported = await hwProvider.isLedgerTransportSupported();
        assert.isTrue(isSupported);
    });

    it("should getAppFeatures", async () => {
        hwApp.version = "1.0.10";
        assert.isFalse(
            (await (<any>hwProvider).getAppFeatures()).mustSignUsingHash
        );
        assert.isFalse(
            (await (<any>hwProvider).getAppFeatures()).canUseGuardian
        );

        hwApp.version = "1.0.11";
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).mustSignUsingHash
        );
        assert.isFalse(
            (await (<any>hwProvider).getAppFeatures()).canUseGuardian
        );

        hwApp.version = "1.0.21";
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).mustSignUsingHash
        );
        assert.isFalse(
            (await (<any>hwProvider).getAppFeatures()).canUseGuardian
        );

        hwApp.version = "1.0.22";
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).mustSignUsingHash
        );
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).canUseGuardian
        );

        hwApp.version = "1.1.0";
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).mustSignUsingHash
        );
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).canUseGuardian
        );

        hwApp.version = "1.1.0";
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).mustSignUsingHash
        );
        assert.isTrue(
            (await (<any>hwProvider).getAppFeatures()).canUseGuardian
        );
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
            assert.equal(
                err.message,
                "MultiversX App v1.0.21 does not support guarded transactions."
            );
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
        deviceVersion: string;
        transactionSignature: string;
        transactionVersion: number;
        transactionOptions: number;
        expectedTransactionVersion: number;
        expectedTransactionOptions: number;
    }) {
        hwApp.version = options.deviceVersion;
        hwApp.transactionSignatures = [options.transactionSignature];

        const transaction = new Transaction({
            sender: Address.fromBech32(
                "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"
            ),
            receiver: Address.fromBech32(
                "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx"
            ),
            gasLimit: BigInt(123456),
            chainID: "D",
            options: options.transactionOptions,
            version: options.transactionVersion
        });

        const signedTransaction = await hwProvider.signTransaction(transaction);

        assert.equal(
            signedTransaction.getSignature().toString("hex"),
            options.transactionSignature
        );
        assert.equal(
            signedTransaction.getVersion().valueOf(),
            options.expectedTransactionVersion
        );
        assert.equal(
            signedTransaction.getOptions().valueOf(),
            options.expectedTransactionOptions
        );
    }

    it("should signTransactions", async () => {
        const txA = new Transaction({
            sender: Address.fromBech32(
                "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"
            ),
            receiver: Address.fromBech32(
                "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx"
            ),
            gasLimit: BigInt(123456),
            chainID: "D",
            nonce: BigInt(42)
        });

        const txB = new Transaction({
            sender: Address.newFromBech32(
                "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"
            ),
            receiver: Address.newFromBech32(
                "erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx"
            ),
            gasLimit: BigInt(123456),
            chainID: "D",
            nonce: BigInt(43)
        });

        hwApp.transactionSignatures = ["aaaa", "bbbb"];

        const transactions = await hwProvider.signTransactions([txA, txB]);
        assert.equal(
            Buffer.from(transactions[0].signature).toString("hex"),
            "aaaa"
        );
        assert.equal(transactions[0].nonce, BigInt(42));
        assert.equal(
            Buffer.from(transactions[1].signature).toString("hex"),
            "bbbb"
        );
        assert.equal(transactions[1].nonce, BigInt(43));
    });

    it("should signMessage", async () => {
        const messageToSign = new Message({
            data: Buffer.from("Hello World"),
            address: Address.fromBech32(
                "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"
            ),
            version: 42
        });

        hwApp.messageSignature = "abba";

        const messageComputer = new MessageComputer();

        const signedMessage = await hwProvider.signMessage(messageToSign);

        assert.equal(
            signedMessage.address?.toString(),
            "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"
        );
        assert.equal(signedMessage.version, 42);
        assert.equal(
            Buffer.from(signedMessage.signature!).toString("hex"),
            "abba"
        );
        assert.deepEqual(
            messageComputer.computeBytesForSigning(messageToSign),
            messageComputer.computeBytesForSigning(signedMessage)
        );
    });
});

class HwAppMock implements IHWWalletApp {
    version = "";
    contractData = 1;
    accountIndex = 0;
    addressIndex = 0;
    address = "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th";
    transactionSignatures: string[] = [];
    messageSignature = "";
    authTokenSignature = "";

    async getAddress() {
        return { address: this.address };
    }

    async setAddress() {
        return { address: this.address };
    }

    async signTransaction(
        _rawTx: Buffer,
        _usingHash: boolean
    ): Promise<string> {
        return this.transactionSignatures.shift() || "";
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

    async getAddressAndSignAuthToken(
        _account: number,
        _index: number,
        _token: Buffer
    ) {
        return {
            address: this.address,
            signature: this.authTokenSignature
        };
    }
}
