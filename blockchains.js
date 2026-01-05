const Blockchains = {
    Ethereum: 'Ethereum',
    Bitcoin: 'Bitcoin',
    Tron: 'Tron',
    Solana: 'Solana',
    Litecoin: 'Litecoin',
    Dogecoin: 'Dogecoin',
    BitcoinCash: 'BitcoinCash',
    BinanceSmartChain: 'BinanceSmartChain',
    Polygon: 'Polygon',
    Avalanche: 'Avalanche',
    ArbitrumOne: 'ArbitrumOne',
    Optimism: 'Optimism',
    Taiko: 'Taiko',
    BitcoinTestnet: 'BitcoinTestnet',
    EthereumRopsten: 'EthereumRopsten',
    EthereumGoerli: 'EthereumGoerli',
    TronShasta: 'TronShasta',
    SolanaTestnet: 'SolanaTestnet',
    TaikoHekla: 'TaikoHekla'
};

const blockchainCurves = {
    Bitcoin: 'secp256k1',
    Ethereum: 'secp256k1',
    Tron: 'secp256k1',
    Solana: 'ed25519',
    Litecoin: 'secp256k1',
    Dogecoin: 'secp256k1',
    BitcoinCash: 'secp256k1',
    BinanceSmartChain: 'secp256k1',
    Polygon: 'secp256k1',
    Avalanche: 'secp256k1',
    ArbitrumOne: 'secp256k1',
    Optimism: 'secp256k1',
    Taiko: 'secp256k1',
    BitcoinTestnet: 'secp256k1',
    EthereumRopsten: 'secp256k1',
    EthereumGoerli: 'secp256k1',
    TronShasta: 'secp256k1',
    SolanaTestnet: 'ed25519',
    TaikoHekla: 'secp256k1'
};

const ofBitcoinFamily = function ofBitcoinFamily(blockchain) {
    return (
        blockchain === Blockchains.Bitcoin ||
        blockchain === Blockchains.BitcoinTestnet ||
        blockchain === Blockchains.Litecoin ||
        blockchain === Blockchains.Dogecoin ||
        blockchain === Blockchains.BitcoinCash
    );
};

const ofEthereumFamily = function ofEthereumFamily(blockchain) {
    return (
        blockchain === Blockchains.Ethereum ||
        blockchain === Blockchains.BinanceSmartChain ||
        blockchain === Blockchains.Polygon ||
        blockchain === Blockchains.Avalanche ||
        blockchain === Blockchains.ArbitrumOne ||
        blockchain === Blockchains.Optimism ||
        blockchain === Blockchains.Taiko ||
        blockchain === Blockchains.EthereumRopsten ||
        blockchain === Blockchains.EthereumGoerli ||
        blockchain === Blockchains.TaikoHekla
    );
};

const ofTronFamily = function ofTronFamily(blockchain) {
    return (
        blockchain === Blockchains.Tron ||
        blockchain === Blockchains.TronShasta
    );
};

const ofSolanaFamily = function ofSolanaFamily(blockchain) {
    return (
        blockchain === Blockchains.Solana ||
        blockchain === Blockchains.SolanaTestnet
    );
};

const isUnsupportedNetwork = function (blockchain) {
    return (
        blockchain === Blockchains.EthereumRopsten
    );
};

// Function to convert BigInt to a 32-byte Uint8Array
const bigIntToUint8Array = function(bigInt, byteLength = 32) {
    const hex = bigInt.toString(16).padStart(byteLength * 2, '0');
    const byteArray = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
      byteArray[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return byteArray;
};

const hexToUint8Array = function(hex, byteLength = 32) {
    const hexFormatted = hex.padStart(byteLength * 2, '0');
    const byteArray = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
      byteArray[i] = parseInt(hexFormatted.substr(i * 2, 2), 16);
    }
    return byteArray;
};

const uint8ArrayToHex = function (uint8Array) {
    return Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
}

module.exports = {
    Blockchains,
    blockchainCurves,
    ofBitcoinFamily,
    ofEthereumFamily,
    ofTronFamily,
    ofSolanaFamily,
    isUnsupportedNetwork,
    bigIntToUint8Array,
    hexToUint8Array,
    uint8ArrayToHex
};