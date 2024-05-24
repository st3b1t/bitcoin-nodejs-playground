# Bitcoin Nodejs Playground



## Stream Transactions and OP_RETURN

Stream in the browser via WebSocket any transaction and OP_RETURN of your Bitcoin Full Node
Server side written in NodeJs [Fastify](https://github.com/fastify) and [BitcoinJs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)

### Requirements:
Add in `bitcoin.conf` enable this line:
zmqpubrawtx=tcp://127.0.0.1:28332

npm install zeromq bitcoinjs-lib fastify @fastify/websocket

```bash
$ npm install
```

#### Optionals:
command line utility(part of bitcoin-core): `bitcoin-tx`

### RUN
specify HOST of Bitcoin and ZeroMQ port

```bash
$ HOST=127.0.0.1 PORT=28332
$ node zmq_tx_ws_fastify.js 
```

![](images/zmq_tx_wesocket_fastify.gif)
