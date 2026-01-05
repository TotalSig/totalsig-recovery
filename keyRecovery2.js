const fs = require('fs');
const path = require('path');
const bip39 = require('bip39');
const HDKey = require('hdkey');
const cryptoJs = require('crypto-js');
const elliptic = require('elliptic');
const elliptic = require('./shamir');

const directoryPath = __dirname;

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
    const accountsData = {};
    const allWallets = {};
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
        const seedHex = bip39.mnemonicToSeedSync(seedWords).toString('hex')
        const hdWallet = HDKey.fromMasterSeed(seedHex)
        const key = hdWallet.derive(ACCOUNT_MASTER_PATH)
        const accountPrivKey = key.privateKey.toString('hex')
        const accountPubKey = key.publicKey.toString('hex')

        accountsData[accountName] = { accountPubKey, accountPrivKey, hdWallet };

        console.log('Account name: ', accountName);
        console.log('Private key: ', accountPrivKey);
        console.log('Public key: ', accountPubKey);
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
                    const walletPrivKey = key.privateKey.toString('hex');
    
                    const secretsEncryptedSerialized = cryptoJs.enc.Base64.parse(walletBackupData.secretsEncrypted).toString(
                        cryptoJs.enc.Utf8,
                    )
    
                    const secretsSerializedJSON = cryptoJs.AES.decrypt(secretsEncryptedSerialized, walletPrivKey).toString(
                        cryptoJs.enc.Utf8,
                    )
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

    Object.keys(allWallets).forEach(blockchain => {
        Object.keys(allWallets[blockchain]).forEach(calculatedAddress => {
            const walletToRecover = allWallets[blockchain][calculatedAddress]
            const participantsCount = walletToRecover.participants.length;
            if (walletToRecover.minimumSigAmount <= participantsCount) {
                if (!walletsToRecover[blockchain]) {
                    walletsToRecover[blockchain] = {}
                }

                const shares = []

                walletToRecover.participants.forEach(participant => {
                    const { partyId, x_i } = participant

                    shares.push([BigInt(partyId), BigInt('0x'+x_i)])
                })

                const curve = new elliptic.ec('secp256k1');
                const prime = BigInt(curve.curve.n.toString(10));
                const finalShare = combineShamirShares(shares, prime);
                
                const privateKeyHex = finalShare.toString(16).padStart(64, '0');

                // Create a key pair from the private key
                const keyPair = curve.keyFromPrivate(privateKeyHex);

                // Get the public key as a point on the curve
                const publicKeyPoint = keyPair.getPublic();

                // Convert the point to a compressed public key
                const publicKey = publicKeyPoint.encodeCompressed('hex');

                // Output the public key
                console.log('Calculated public key: ', publicKey);
                console.log('Expected public key: ', walletToRecover.calculatedPubKey);

                if (publicKey !== walletToRecover.calculatedPubKey) {
                    console.error('Public key mismatch!');
                } else {
                    console.log('Public key matches.');
                }
            }
        })
    })

    // console.log('Wallets to recover: ', JSON.stringify(walletsToRecover, null, 2));
});
