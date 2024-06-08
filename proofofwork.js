/*
  Proof Of Work in NodeJs
  usage:
    $ node index.js <DIFFICULTY>
*/
const crypto = require('crypto');

const difficulty = Number(process.argv[2] ?? 4);
const blockHeader = 'Bl0ckH34d3r:';
const prefix = '0';

const humanCount = (count) =>
  count < 1e3 ? count.toString() :
  count < 1e6 ? (count / 1e3).toFixed(1) + 'K' :
  count < 1e9 ? (count / 1e6).toFixed(1) + 'M' :
  (count / 1e9).toFixed(1) + 'G';

const sha256sum = (img) => crypto.createHash('sha256').update(img).digest('hex');

const randomBlock = (len) => `${blockHeader}`+crypto.randomBytes((len-blockHeader.length) / 2).toString('hex');

function proofOfWork(data, dif) {
  let nonce = 0;
  let hash = '';

  while (!hash.startsWith( prefix.repeat(dif) )) {
    nonce++;
    hash = sha256sum(data + nonce);
    process.stdout.write(`  Attempts: ${humanCount(nonce).padStart(10,' ')}\r`);
  }

  return { nonce, hash, difficulty };
}

function verifyProofOfWork(block, nonce, difficulty) {
  const hash = sha256sum( block + nonce );
  return hash.startsWith( prefix.repeat(difficulty) );
}

//New block

const block = randomBlock(64);

console.log(`
  Proof of Work difficulty ${difficulty}
  Block: "${block}"
`);

const startTimeW = Date.now()
    , { nonce, hash } = proofOfWork(block, difficulty)
    , endTimeW = Date.now()
    , secs = Number(endTimeW - startTimeW) / 1000;

console.log(`

  Nonce Found: ${nonce}
  Hash:  "${hash}"
  Time to Work: ${secs} secs
`);

//Validation

const startTimeV = process.hrtime.bigint()
    , valid = verifyProofOfWork(block, nonce, difficulty)
    , endTimeV = process.hrtime.bigint()
    , msecs = Number(endTimeV - startTimeV) / 1e6;

console.log(`
  Validate Proof of work: ${valid}
  Time to Validate: ${msecs} msecs
`);
