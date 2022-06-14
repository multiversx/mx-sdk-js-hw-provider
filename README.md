# Elrond SDK for JavaScript: hardware wallet provider

Signing provider for dApps: hardware wallet (Ledger).

An integration sample can be found further below. However, for all purposes, **we recommend using [dapp-core](https://github.com/ElrondNetwork/dapp-core)** instead of integrating the signing provider on your own.

## Distribution

[npm](https://www.npmjs.com/package/@elrondnetwork/erdjs-hw-provider)

## Installation

`erdjs-hw-provider` is delivered via [npm](https://www.npmjs.com/package/@elrondnetwork/erdjs-hw-provider), therefore it can be installed as follows:

```
npm install @elrondnetwork/erdjs-hw-provider
```

### Building the library

In order to compile `erdjs-hw-provider`, run the following:

```
npm install
npm run compile
```

### Example application

```
 const provider = new lib.HWProvider();

        async function init() {
            await provider.init();
            console.log("Initialized.");
        }

        async function login() {
            var addressIndex = parseInt(document.getElementsByName("addressIndexForLogin")[0].value);
            console.log("Login with addressIndex", addressIndex);
            await provider.login({ addressIndex: addressIndex });
            await logAddresses();

            alert(`Logged in. Address: ${await provider.getAddress()}`);
        }

        async function logAddresses() {
            let addresses = await provider.getAccounts();
            let currentAddress = await provider.getAddress();

            console.log("Addresses:", addresses);
            console.log("Current address:", currentAddress);
        }

        async function setAddressIndex() {
            var addressIndex = parseInt(document.getElementsByName("addressIndexForSetAddress")[0].value);
            console.log("Set addressIndex", addressIndex);
            await provider.setAddressIndex(addressIndex);
            await logAddresses();

            alert(`Address has been set: ${await provider.getAddress()}.`);
        }

        async function signTransaction() {
            let transaction = new DummyTransaction(0);
            await provider.signTransaction(transaction);

            alert(`Done signing single transaction. Signature: ${transaction.signature}`);
        }

        async function signTransactions() {
            let transactions = [new DummyTransaction(1), new DummyTransaction(2)];
            await provider.signTransactions(transactions);

            alert(`Done signing multiple transactions. Signatures: ${JSON.stringify(transactions.map(tx => tx.signature), null, 4)}`);
        }

        function DummyTransaction(nonce) {
            // These will be set by hwProvider before calling serializeForSigning().
            this.version = {};
            this.options = {};

            this.signature = null;
            this.signedBy = null;

            this.serializeForSigning = function (signedBy) {
                console.log("DummyTransaction.serializeForSigning()", signedBy.bech32());
                console.log("Transaction version", this.version);
                console.log("Transaction options", this.options);

                let json = JSON.stringify({
                    nonce: nonce,
                    value: "1",
                    receiver: "erd1uv40ahysflse896x4ktnh6ecx43u7cmy9wnxnvcyp7deg299a4sq6vaywa",
                    sender: signedBy.bech32(),
                    gasPrice: 1000000000,
                    gasLimit: 50000,
                    data: btoa("hello"),
                    chainID: "1",
                    version: this.version.valueOf(),
                    options: this.options.valueOf()
                });

                console.log("Serialized transaction:");
                console.log(json);
                return json;
            };

            this.applySignature = function (signature, signedBy) {
                this.signature = signature.hex();
                this.signedBy = signedBy.bech32();
                console.log("DummyTransaction.applySignature()", this.signature, this.signedBy);
            }
        }
```