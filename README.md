# Elrond SDK for JavaScript: hardware wallet provider

Signing provider for dApps: hardware wallet (Ledger).

An integration sample can be found [here](examples/index.html). However, for all purposes, **we recommend using [dapp-core](https://github.com/ElrondNetwork/dapp-core)** instead of integrating the signing provider on your own.

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

### Running the examples

Make sure you have the package `http-server` installed globally.

```
npm install --global http-server
```

Note that the examples can only be served via HTTPS (a dummy certificate is included in the `examples` folder).

When you are ready, build the examples:

```
npm run compile-examples
```

Start the server and navigate to `https://localhost:8080/examples/index.html`

```
http-server -S -C ./examples/dummy-certificate.pem -K ./examples/dummy-certificate-key.pem --port=8080
```
