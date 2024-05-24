/**
 * Copyright 2024 github.com/st3b1t license: GPL3
 * requirements:
 *  on bitcoin.conf enable this line:
 *  zmqpubrawtx=tcp://127.0.0.1:28332
 */
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const zmq = require('zeromq');  //https://zeromq.github.io/zeromq.js/
const bitcoin = require('bitcoinjs-lib');
const logger = false;
const fastify = require('fastify')({logger});
const fastifyWs = require('@fastify/websocket');
const EventEmitter = require('node:events');
const eventEmitter = new EventEmitter();

//configurations
const USE_CLI = process.argv[2] === '--bitcoin-tx-cli';  //use bitcoin-tx command
const {HOST='127.0.0.1', PORT=28332} = process.env;
const zmqaddress = `tcp://${HOST}:${PORT}`
const zmqsub = 'rawtx'
const port = 8080;  //listen port for browser

function hexToUtf8(hex) {
    return Buffer.from(hex,'hex').toString('utf8');
}

const classifyOutputScript = output => {
  const isOutput = paymentFn => {
    try {
      return paymentFn({output})
    } catch (e) {}
  }
  if (isOutput(bitcoin.payments.p2pk)) return 'pubkey'
  else if (isOutput(bitcoin.payments.p2pkh)) return 'pubkeyhash'
  else if (isOutput(bitcoin.payments.p2ms)) return 'multisig'
  else if (isOutput(bitcoin.payments.p2wpkh)) return 'witnesspubkeyhash'
  else if (isOutput(bitcoin.payments.p2sh)) return 'scripthash'
  else if (isOutput(bitcoin.payments.embed)) return 'nulldata'
  return 'nonstandard'
}

async function decodeTx(rawTx) {
    const tx = bitcoin.Transaction.fromBuffer(rawTx);
    return {
      txid: tx.getId(),
      version: tx.version,
      locktime: tx.locktime,
      vin: tx.ins.map(input => ({
        txid: Buffer.from(input.hash).reverse().toString('hex'),
        vout: input.index,
        scriptSig: input.script.toString('hex'),
        sequence: input.sequence,
      })),
      vout: tx.outs.map((output, index) => ({
        value: output.value / 1e8, // converti satoshi in bitcoin
        n: index,
        scriptPubKey: {
          asm: bitcoin.script.toASM(output.script),
          hex: output.script.toString('hex'),
          type: classifyOutputScript(output.script)
        }
      }))
    };
}

async function decodeTxCli(tx) {
    const hexTx = tx.toString('hex');
    const {stdout, stderr} = await exec(`bitcoin-tx -json ${hexTx}`)
    return JSON.parse(stdout.toString('utf8'));
}

//use bitcoinjs-lib or bitcoin-tx
const decodeRawTx = USE_CLI ? decodeTxCli : decodeTx;

console.log('Use:', USE_CLI ? 'bitcoin-tx' : 'bitcoinjs-lib' , 'to decode TXs')

fastify.register(fastifyWs);
fastify.register(async function (fastify) {
  fastify.get('/stream', { websocket: true }, (sockws, req) => {
    eventEmitter.on('tx', msg => {
      sockws.send(msg);
    });
  });
});

//homepage
fastify.get('/', (req, res) => {
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <textarea rows="20" cols="120"></textarea>
      <script>
        const ws = new WebSocket('ws://' + location.host + '/stream')
            , texta = document.getElementsByTagName('textarea')[0];
        ws.onmessage = function(e) {
          texta.value += e.data;
          texta.scrollTop = texta.scrollHeight;
        };
      </script>
    </body>
    </html>
  `);
});

const main = async () => {

  const TT = {}
  const sockz = zmq.socket('sub');
  console.log(`ZMQ Connect: ${zmqaddress} Subscribe: ${zmqsub}...`);

  sockz
  .on('connect', function() {
    console.log('connected:', arguments)
  })
  .connect(zmqaddress)
  .subscribe(zmqsub)
  .on('message', async (topic, message) => {

      const rawTx = await decodeRawTx(message);

      rawTx.vout.forEach(vout => {
        const {type} = vout.scriptPubKey
            , hex = hexToUtf8(vout.scriptPubKey.hex)

        TT[type] = TT[type] ? TT[type]+1 : 1;

        //if (type === 'nulldata') {  //only op_return timstamps
          const msg = `TX: ${rawTx.txid}:${vout.n} TYPE: ${type}\nOP_RETURN: ${hex}\n`
          console.log(msg)
          eventEmitter.emit('tx', msg)
        //}
      });
  });

  process.on('SIGINT', () => {
    sockz.close();
    fastify.close()
    process.exit(0);
  });

  console.log(`Open Browser on http://localhost:${port}`)
  await fastify.listen({port});
};

main();