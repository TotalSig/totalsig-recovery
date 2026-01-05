const fs = require('fs');
const path = require('path');
const bip39 = require('bip39');
const HDKey = require('hdkey');
const cryptoJs = require('crypto-js');
const elliptic = require('elliptic');
const ed25519 = require('@noble/ed25519');
const ShamirSecretSharing = require('./shamir');
const blockchains = require('./blockchains');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const crypto = require('crypto');

const directoryPath = process.cwd();

const FILE_NAME = 'keys.txt';

fs.writeFileSync(FILE_NAME, ''); // This will empty the file

// Regular expression to match files with the structure accountName-seed.txt
const accountPattern = /^([a-zA-Z0-9]+)-seed\.txt$/;

const ACCOUNT_MASTER_PATH = "m/44'"

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.error('Unable to scan directory: ' + err);
    }

    // Filter the files to get only .txt files
    const accountFiles = files.filter(file => accountPattern.test(file));

    const accountNames = accountFiles
        .map(file => {
            const match = file.match(accountPattern);
            return match ? match[1] : null;
        })
        .filter(name => name !== null);

    // Array to store private key of each matched file
    const accountsData = [];
    const allWallets = {};
    const skippedWallets = {};
    const walletsToRecover = {};

    // Output the matched account names and their trimmed content
    console.log('Found accounts:');

    accountNames.forEach(accountName => {
        const seedFilePath = path.join(directoryPath, `${accountName}-seed.txt`);

        const seedFileContent = fs.readFileSync(seedFilePath, 'utf8');
        const seedWords = seedFileContent
            .replace(/\d+/g, '')  // Remove all digits
            .replace(/\./g, '')   // Remove all periods
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
            .trim();              // Trim leading and trailing spaces        

        // Generate BIP39 mnemonic
        // const mnemonic = bip39.entropyToMnemonic(trimmedContent);
        const seedHex = bip39.mnemonicToSeedSync(seedWords).toString('hex')
        const hdWallet = HDKey.fromMasterSeed(seedHex)
        const key = hdWallet.derive(ACCOUNT_MASTER_PATH)
        const accountPrivKey = key.privateKey.toString('hex')
        const accountPubKey = key.publicKey.toString('hex')

        accountsData[accountName] = { accountPubKey, accountPrivKey, hdWallet };

        console.log(`Account "${accountName}": ${accountPubKey}`);
    });

    accountNames.forEach(accountName => {
        // Backup file path
        const backupFilePath = path.join(directoryPath, `${accountName}-backups.txt`);
        const { accountPrivKey, accountPubKey, hdWallet } = accountsData[accountName]

        // Check if corresponding backup file exists and read its content
        if (fs.existsSync(backupFilePath)) {
            const encryptedBackup = fs.readFileSync(backupFilePath, 'utf8');
            const encryptedBackupSerialized = cryptoJs.enc.Base64.parse(encryptedBackup).toString(cryptoJs.enc.Utf8)
            const walletsBackupDataJSON = cryptoJs.AES.decrypt(encryptedBackupSerialized, accountPrivKey).toString(cryptoJs.enc.Utf8)
            const walletsBackupData = JSON.parse(walletsBackupDataJSON)

            walletsBackupData.forEach(walletBackupData => {
                try {
                    const { blockchain, calculatedAddress, calculatedPubKey, minimumSigAmount, partiesAmount, partyId, path } = walletBackupData

                    if (blockchains.isUnsupportedNetwork(blockchain)) {
                        if (!skippedWallets[calculatedAddress]) skippedWallets[calculatedAddress] = {}
                        skippedWallets[calculatedAddress][blockchain] = 1
                        return
                    }

                    if (!allWallets[blockchain]) {
                        allWallets[blockchain] = {}
                    }
    
                    if (!allWallets[blockchain][calculatedAddress] ) {
                        allWallets[blockchain][calculatedAddress]  = {
                            calculatedPubKey,
                            minimumSigAmount,
                            partiesAmount,
                            participants: []
                        }
                    }
    
                    const key = hdWallet.derive(walletBackupData.path)   
                    const blockchainCurve = blockchains.blockchainCurves[blockchain]

                    const secretsEncryptedSerialized = cryptoJs.enc.Base64.parse(walletBackupData.secretsEncrypted).toString(
                        cryptoJs.enc.Utf8,
                    )

                    const walletPrivKey = key.privateKey.toString('hex');
                    let secretsSerializedJSON;

                    if (blockchainCurve === 'secp256k1') {
                        secretsSerializedJSON = cryptoJs.AES.decrypt(secretsEncryptedSerialized, walletPrivKey).toString(
                            cryptoJs.enc.Utf8,
                        )
                    } else if (blockchainCurve === 'ed25519') {
                        const encryptionSalt = BigInt(`0x${walletPrivKey}`) % ed25519.CURVE.n

                        const intToHexPadded = function (bigint) {
                            var base = 16
                            var hex = bigint.toString(base).padStart(64, '0')
                            return hex
                        }
        
                        secretsSerializedJSON = cryptoJs.AES.decrypt(secretsEncryptedSerialized, intToHexPadded(encryptionSalt)).toString(
                            cryptoJs.enc.Utf8,
                        )
                    }
                    const secretsSerialized = JSON.parse(secretsSerializedJSON)
 
                    if (secretsSerialized.x_i || secretsSerialized.s_i) {
                        allWallets[blockchain][calculatedAddress].participants.push({
                            partyId, path, pubKey: accountPubKey, accountName, x_i: (secretsSerialized.x_i || secretsSerialized.s_i)
                        })
                    } else {
                        throw Error(secretsSerialized)
                    }
                } catch(e) {
                    console.log(`Failed to recover ${walletBackupData.blockchain} wallet: ${walletBackupData.calculatedAddress}`)
                }
            })
        }
    });

    Object.keys(skippedWallets).forEach(calculatedAddress => {
        Object.keys(skippedWallets[calculatedAddress]).forEach(blockchain => {
            console.log(`Wallet recovery forconst crypto = require('crypto'); ${calculatedAddress} skipped: blockchain ${blockchain} is unsupported. `)
        })
    })

    Object.keys(allWallets).forEach(blockchain => {
        Object.keys(allWallets[blockchain]).forEach(calculatedAddress => {
            const walletToRecover = allWallets[blockchain][calculatedAddress]
            participantsCount = walletToRecover.participants.length
            if (walletToRecover.minimumSigAmount <= participantsCount) {
                if (!walletsToRecover[blockchain]) {
                    walletsToRecover[blockchain] = {}
                }

                const shares = []

                walletToRecover.participants.forEach(participant => {
                    const { partyId, x_i, walletPrivKey } = participant

                    shares.push([BigInt(partyId), BigInt('0x'+x_i)])
                })

                let keyPair, publicKey, privateKeyBigInt, privateKeyHex;

                const blockchainCurve = blockchains.blockchainCurves[blockchain]
                if (blockchainCurve === 'secp256k1') {
                    const prime = BigInt(elliptic.curves.secp256k1.curve.n);
                    privateKeyBigInt = ShamirSecretSharing.reconstructSecret(shares.slice(0, walletToRecover.minimumSigAmount), prime)
    
                    privateKeyHex = privateKeyBigInt.toString(16).padStart(64, '0');

                    // Create a key pair from the private key
                    const ec = new elliptic.ec('secp256k1');
                    keyPair = ec.keyFromPrivate(privateKeyHex);

                    // Get the public key as a point on the curve
                    const publicKeyPoint = keyPair.getPublic();

                    // Convert the point to a compressed public key
                    publicKey = publicKeyPoint.encodeCompressed('hex');
                } else if (blockchainCurve === 'ed25519') {
                    const prime = BigInt(ed25519.CURVE.n);
                    privateKeyBigInt = ShamirSecretSharing.reconstructSecret(shares.slice(0, walletToRecover.minimumSigAmount), prime)
    
                    privateKeyHex = privateKeyBigInt.toString(16).padStart(64, '0');

                    // Generate the public key from the private key
                    let publicKeyPoint = ed25519.Point.BASE.multiply(privateKeyBigInt);

                    // Convert the public key to a hex string
                    publicKey = publicKeyPoint.toHex();
                }

                if (publicKey === allWallets[blockchain][calculatedAddress].calculatedPubKey) {
                    if (blockchains.ofBitcoinFamily(blockchain)) {
                        fs.appendFileSync(FILE_NAME, `${blockchain} address ${calculatedAddress} has private key - ${privateKeyHex}` + '\n');
                    } else if (blockchains.ofEthereumFamily(blockchain)) {
                        fs.appendFileSync(FILE_NAME, `${blockchain} address ${calculatedAddress} has private key - 0x${privateKeyHex}` + '\n');
                    } else if (blockchains.ofTronFamily(blockchain)) {
                        fs.appendFileSync(FILE_NAME, `${blockchain} address ${calculatedAddress} has private key - ${privateKeyHex}` + '\n');
                    } else if (blockchains.ofSolanaFamily(blockchain)) {
                        const privateKeyArray = blockchains.bigIntToUint8Array(privateKeyBigInt);
                        const publicKeyArray = blockchains.bigIntToUint8Array(BigInt('0x'+publicKey));
                        const combinedKeyArray = new Uint8Array(64);
                        combinedKeyArray.set(privateKeyArray);
                        combinedKeyArray.set(publicKeyArray, 32);

                        // console.log("publicKey", publicKey)
                        
                        fs.appendFileSync(FILE_NAME, `${blockchain} address ${calculatedAddress} has private key - ${blockchains.uint8ArrayToHex(combinedKeyArray)}` + '\n');
                    } else {
                        fs.appendFileSync(FILE_NAME, `${blockchain} address ${calculatedAddress} has private key - ${privateKeyHex}` + '\n');   
                    }
                } else {
                    // Something terribly wrong has happened
                    console.log(`!!! Failed to recover ${blockchain} address ${calculatedAddress}`)
                }
            }
        })
    })

    // Step 1: Convert hex seed to Uint8Array
    const seed = blockchains.hexToUint8Array('adbcc90954473bf849611466dce2573a5d639655158066fa7dd68960221e89c5');

    // Step 2: Hash the seed using SHA-512
    const hash = crypto.createHash('sha512').update(seed).digest();

    // Step 3: Clamp the hash
    const privateKey = new Uint8Array(hash.slice(0, 32));
    privateKey[0] &= 248;
    privateKey[31] &= 127;
    privateKey[31] |= 64;

        // Step 4: Generate the key pair from the private key
        const keyPair = nacl.sign.keyPair.fromSeed(privateKey);

        // Step 5: Extract the secret key (64 bytes) - private key + public key
        const secretKey = new Uint8Array(64);
        secretKey.set(privateKey, 0);
        secretKey.set(keyPair.publicKey, 32);

        // Step 6: Generate the key pair from the secret key
        const derivedKeyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
        console.log('Public Key:', blockchains.uint8ArrayToHex(derivedKeyPair.publicKey));

    privateKey.reverse()

    // Convert the clamped private key to a big integer
    const privateKeyBigInt = BigInt(`0x${blockchains.uint8ArrayToHex(privateKey)}`);

    // Define the order of the Ed25519 curve (L)
    const prime = BigInt(ed25519.CURVE.n); // 0x1000000000000000000000000000000014DEF9DEA2F79CD65812631A5CF5D3ED

    // Ensure the scalar is reduced modulo the curve order
    const reducedPrivateKeyBigInt = privateKeyBigInt % prime;

    // Step 4: Scalar multiplication with the base point
    const publicKeyPoint = ed25519.Point.BASE.multiply(reducedPrivateKeyBigInt);
    const publicKey = publicKeyPoint.toRawBytes();

    console.log('publicKey:', blockchains.uint8ArrayToHex(publicKey));

    // Step 5: Encode the public key as a Solana address using base58
    const solanaAddress = bs58.encode(publicKey);

    console.log('Solana Address:', solanaAddress);


    console.log(`Done!`)
});
