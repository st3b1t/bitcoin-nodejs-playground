const crypto = require('crypto');

const targetDifficultyBits = Number(process.argv[2] ?? 20); // Difficoltà in bit (ad esempio, 20 bit iniziali devono essere zero)
const validate = !!Number(process.argv[3]) ?? false

// Calcola il target in base alla difficoltà in bit
function getTargetDifficulty(difficultyBits) {
  const fullBytes = Math.floor(difficultyBits / 8);
  const remainderBits = difficultyBits % 8;

  let target = Buffer.alloc(fullBytes, 0);
  if (remainderBits > 0) {
    const lastByte = 0xff << (8 - remainderBits) & 0xff;
    target = Buffer.concat([target, Buffer.from([lastByte])]);
  }
  return target.toString('hex').padEnd(64, '0');
}

const targetPrefix = getTargetDifficulty(targetDifficultyBits);

const maxDisplayLength = Math.floor(process.stdout.columns - 20); // Adatta in modo ragionevole

function calculateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

const humanizeAttempts = (attempts) =>
  attempts < 1e3 ? attempts.toString() :
  attempts < 1e6 ? (attempts / 1e3).toFixed(1) + 'K' :
  attempts < 1e9 ? (attempts / 1e6).toFixed(1) + 'M' :
  (attempts / 1e9).toFixed(1) + 'G';

function padAttempts(attempts, length) {
  return attempts.padStart(length, ' ');
}

function bufferToBinaryString(buffer) {
  return Array.from(buffer)
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join('');
}

async function proofOfWork(data) {
  let nonce = 0;
  let hash = '';
  let hashBin = '';

  const targetBuffer = Buffer.from(targetPrefix, 'hex');

  // Incrementa il nonce fino a trovare un hash che soddisfi il target
  while (true) {
    nonce++;
    hash = calculateHash(data + nonce);
    const hashBuffer = Buffer.from(hash, 'hex');

    hashBin = bufferToBinaryString(hashBuffer).substr(0, maxDisplayLength)
    const targetBin = bufferToBinaryString(targetBuffer).substr(0, maxDisplayLength)
    const humanizedAttempts = padAttempts(humanizeAttempts(nonce), 10);

    process.stdout.write(`\nPOW hash: ${targetBin}`);
    process.stdout.write(`\nNEW hash: ${hashBin}`);
    process.stdout.write(`\nAttempts: ${humanizedAttempts}`);

    if (hashBuffer.compare(targetBuffer) <= 0) {
      break;
    }
    // Yield to event loop to keep the application responsive
    //await new Promise(resolve => setImmediate(resolve));
  }

  return { nonce, hash, hashBin };
}

function verifyProofOfWork(data, nonce, targetDifficultyBits) {
  const hash = calculateHash(data + nonce);
  const targetBuffer = Buffer.from(getTargetDifficulty(targetDifficultyBits), 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');
  return hashBuffer.compare(targetBuffer) <= 0;
}

// Genera una stringa casuale di 16 caratteri esadecimali
function generateRandomString(length) {
  // Dividiamo length per 2 perché ogni byte genera 2 caratteri esadecimali
  return crypto.randomBytes(length / 2).toString('hex');
}

// Funzione principale asincrona
(async () => {
  // Dati casuali da hashare
  const data = generateRandomString(16);

  // Esegui la proof of work
  const startTime = Date.now();
  const { nonce, hash, hashBin } = await proofOfWork(data);
  const endTime = Date.now();

  // Pulire la linea dei tentativi
  process.stdout.write('\n');

  console.log(`Nonce found: ${nonce}`);
  console.log(`Hash found:  ${hash}`);
  console.log(`Hash binary: ${hashBin}`);
  console.log(`Time to Work: ${(endTime - startTime) / 1000} secs`);

  if (validate) {
    // Misura il tempo di validazione
    const validationStartTime = process.hrtime.bigint();
    const isValid = verifyProofOfWork(data, nonce, targetDifficultyBits);
    const validationEndTime = process.hrtime.bigint();

    const validationTimeMilliseconds = Number(validationEndTime - validationStartTime) / 1e6;

    console.log(`Proof of Work is ${isValid ? 'valid' : 'not valid'}`);
    console.log(`Time to validation: ${validationTimeMilliseconds} msecs`);
  }
})();
